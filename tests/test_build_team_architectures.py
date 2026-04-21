import json
import random
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import build_team_architectures as bta


class DetectPrimitivesTests(unittest.TestCase):
    def test_detects_products_from_wrangler_and_package_manifest(self) -> None:
        wrangler = """
        {
          "pages_build_output_dir": "dist",
          "d1_databases": [{ "binding": "DB" }],
          "browser": { "binding": "BROWSER", "type": "browser" },
          "containers": [{ "class_name": "Runner", "image": "./Dockerfile" }],
          "hyperdrive": [{ "binding": "HYPERDRIVE" }],
          "images": { "binding": "IMAGES" },
          "send_email": [{ "name": "EMAIL" }],
          "analytics_engine_datasets": [{ "binding": "ANALYTICS" }],
          "dispatch_namespaces": [{ "binding": "DISPATCHER" }],
          "secrets_store_secrets": [{ "binding": "SECRET_STORE" }]
        }
        """
        package = json.dumps(
            {
                "scripts": {"deploy": "npm run build && wrangler pages deploy dist"},
                "dependencies": {
                    "@cloudflare/ai-gateway": "1.0.0",
                    "@cloudflare/ai-chat": "1.0.0",
                    "@cloudflare/containers": "1.0.0",
                    "@cloudflare/realtimekit-react": "1.0.0",
                    "@cloudflare/stream-react": "1.0.0",
                    "@cloudflare/voice": "1.0.0",
                    "agents": "1.0.0",
                },
                "devDependencies": {
                    "@cloudflare/puppeteer": "1.0.0",
                    "@cloudflare/shell": "1.0.0",
                    "@cloudflare/think": "1.0.0",
                },
            }
        )

        detected = bta.detect_primitives(wrangler, package)

        self.assertEqual(detected["has_static_assets"], False)
        self.assertEqual(detected["has_cron"], False)
        self.assertTrue(
            {
                "workers",
                "pages",
                "d1",
                "browser",
                "containers",
                "hyperdrive",
                "images",
                "email",
                "analytics-engine",
                "workers-for-platforms",
                "secret-store",
                "ai",
                "ai-gateway",
                "realtime",
                "stream",
                "voice",
                "sandboxes",
                "agents",
            }.issubset(detected["primitives"])
        )

    def test_generate_nodes_and_flows_cover_new_products(self) -> None:
        primitives = {"workers", "pages", "agents", "containers", "email"}

        nodes = bta.generate_nodes(primitives, False, False)
        flows = bta.generate_flows(primitives, False, False)

        node_primitives = [node["primitive"] for node in nodes]
        self.assertIn("pages", node_primitives)
        self.assertIn("agents", node_primitives)
        self.assertIn("containers", node_primitives)
        self.assertIn("email", node_primitives)

        self.assertIn({"from": "Browser", "to": "Pages", "label": "GET /"}, flows)
        self.assertIn({"from": "Workers", "to": "Agents", "label": "Run agents"}, flows)

    def test_should_include_detected_project_rejects_plain_workers(self) -> None:
        self.assertFalse(bta.should_include_detected_project({"workers"}, False, False))
        self.assertTrue(
            bta.should_include_detected_project({"workers", "agents"}, False, False)
        )

    def test_discover_user_includes_repo_when_only_package_manifest_signals_cloudflare(
        self,
    ) -> None:
        package = json.dumps(
            {
                "dependencies": {
                    "@cloudflare/agents": "1.0.0",
                }
            }
        )

        with (
            patch.object(
                bta,
                "list_repos",
                return_value=[{"name": "package-only-agent", "description": ""}],
            ),
            patch.object(bta, "find_wrangler_config", return_value=None),
            patch.object(bta, "find_package_manifest", return_value=package),
        ):
            projects, total = bta.discover_user("example")

        self.assertEqual(total, 1)
        self.assertEqual(
            [project["id"] for project in projects], ["package-only-agent"]
        )
        self.assertIn("agents", {node["primitive"] for node in projects[0]["nodes"]})

    def test_property_package_only_cloudflare_signals_admit_repo_without_wrangler(
        self,
    ) -> None:
        rng = random.Random(0)
        dependency_sections = [
            "dependencies",
            "devDependencies",
            "peerDependencies",
            "optionalDependencies",
        ]
        signal_cases = [
            ("@cloudflare/agents", "agents"),
            ("@cloudflare/sandbox", "sandboxes"),
            ("@cloudflare/ai-gateway", "ai-gateway"),
            ("@cloudflare/realtimekit-react", "realtime"),
            ("@cloudflare/stream-react", "stream"),
            ("@cloudflare/voice", "voice"),
        ]

        for index in range(50):
            section = rng.choice(dependency_sections)
            package_name, expected_primitive = rng.choice(signal_cases)
            manifest = {
                section: {
                    package_name: "1.0.0",
                    f"example-{index}": "0.0.1",
                }
            }
            package = json.dumps(manifest)

            with self.subTest(section=section, package_name=package_name, index=index):
                with (
                    patch.object(
                        bta,
                        "list_repos",
                        return_value=[{"name": f"repo-{index}", "description": ""}],
                    ),
                    patch.object(bta, "find_wrangler_config", return_value=None),
                    patch.object(bta, "find_package_manifest", return_value=package),
                ):
                    projects, total = bta.discover_user("example")

                self.assertEqual(total, 1)
                self.assertEqual(len(projects), 1)
                self.assertIn(
                    expected_primitive,
                    {node["primitive"] for node in projects[0]["nodes"]},
                )

    def test_gh_retries_with_exponential_backoff_and_jitter_on_rate_limit(self) -> None:
        rate_limited = SimpleNamespace(
            returncode=1,
            stdout='{"message":"API rate limit exceeded","status":"403"}',
            stderr="gh: API rate limit exceeded (HTTP 403)",
        )
        success = SimpleNamespace(returncode=0, stdout='[{"name":"repo"}]', stderr="")

        with (
            patch.object(
                bta.subprocess, "run", side_effect=[rate_limited, success]
            ) as mock_run,
            patch.object(bta.time, "sleep") as mock_sleep,
            patch.object(bta.random, "uniform", return_value=0.25),
        ):
            raw = bta.gh('api "users/example/repos"')

        self.assertEqual(raw, '[{"name":"repo"}]')
        self.assertEqual(mock_run.call_count, 2)
        mock_sleep.assert_called_once_with(1.25)

    def test_parse_repo_filters_groups_targets_by_user(self) -> None:
        self.assertEqual(
            bta.parse_repo_filters("zeke/solitaire,zeke/anyhenge,yusukebe/gh-x"),
            {
                "zeke": {"solitaire", "anyhenge"},
                "yusukebe": {"gh-x"},
            },
        )

    def test_analyze_repo_via_tree_reuses_snapshot_when_tree_is_unchanged(self) -> None:
        repo = {"name": "cached-repo", "defaultBranch": "main"}
        snapshot = {
            "treeSha": "same-sha",
            "analysisVersion": bta.ANALYSIS_VERSION,
            "included": True,
            "project": {"id": "cached-repo", "nodes": [], "flows": []},
            "files": {},
        }

        with (
            patch.object(
                bta,
                "list_repo_tree",
                return_value={"sha": "same-sha", "entries": []},
            ),
            patch.object(bta, "fetch_blob_content") as mock_fetch,
        ):
            project, updated_snapshot = bta.analyze_repo_via_tree(
                "example", repo, snapshot, force_refresh=False
            )

        self.assertEqual(project, snapshot["project"])
        self.assertEqual(updated_snapshot["treeSha"], "same-sha")
        mock_fetch.assert_not_called()

    def test_force_refresh_reanalyzes_from_cached_local_files_when_tree_is_unchanged(
        self,
    ) -> None:
        repo = {"name": "cached-repo", "defaultBranch": "main"}
        snapshot = {
            "treeSha": "same-sha",
            "analysisVersion": 0,
            "included": True,
            "project": {"id": "cached-repo", "nodes": [], "flows": []},
            "files": {
                "package.json": {
                    "sha": "pkg-sha",
                    "content": json.dumps(
                        {"dependencies": {"@cloudflare/agents": "1.0.0"}}
                    ),
                }
            },
        }
        tree = {
            "sha": "same-sha",
            "entries": [{"path": "package.json", "sha": "pkg-sha", "type": "blob"}],
        }

        with (
            patch.object(bta, "list_repo_tree", return_value=tree),
            patch.object(bta, "fetch_blob_content") as mock_fetch,
        ):
            project, updated_snapshot = bta.analyze_repo_via_tree(
                "example", repo, snapshot, force_refresh=True
            )

        self.assertIsNotNone(project)
        self.assertIn("agents", {node["primitive"] for node in project["nodes"]})
        self.assertTrue(updated_snapshot["included"])
        mock_fetch.assert_not_called()

    def test_main_preserves_existing_cache_on_force_refresh_failure(self) -> None:
        existing_cache = {
            "kept-user": {"projects": [{"id": "existing-project"}], "totalFound": 1}
        }

        with (
            patch.object(sys, "argv", ["script.py", "--force-refresh"]),
            patch.object(bta, "check_github_auth", return_value=(True, "")),
            patch.object(bta, "load_cache", return_value=existing_cache),
            patch.object(bta, "ensure_rate_limit_budget"),
            patch.object(
                bta,
                "discover_user_with_snapshots",
                side_effect=bta.GitHubApiError("rate limited"),
            ),
            patch.object(bta, "save_cache") as mock_save,
        ):
            with self.assertRaises(bta.GitHubApiError):
                bta.main()

        mock_save.assert_called_once_with(existing_cache)


if __name__ == "__main__":
    unittest.main()
