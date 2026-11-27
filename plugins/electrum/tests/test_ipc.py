import concurrent.futures
import unittest

from onekey.ipc import Helper, HelperError, SDK_VERSION


class TestHelperIPC(unittest.TestCase):
    def test_main_thread_cannot_block_qt(self):
        with self.assertRaisesRegex(HelperError, "GUI_THREAD"):
            Helper().call("search", {})

    def test_hello_and_invalid_operation(self):
        helper = Helper()
        self.addCleanup(helper.shutdown)
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            hello = pool.submit(helper.call, "hello", {}).result(timeout=2)
            self.assertEqual({"protocol": 1, "sdkVersion": SDK_VERSION}, hello)
            self.assertIsNone(helper.process)
            with self.assertRaisesRegex(HelperError, "INVALID_REQUEST"):
                pool.submit(helper.call, "unknown", {}).result(timeout=2)


if __name__ == "__main__":
    unittest.main()
