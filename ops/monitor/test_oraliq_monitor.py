import unittest

from oraliq_monitor import handle_observation


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.state, self.delivered, self.saved = {}, [], []
        self.now = 1_000_000

    def observe(self, issues, enabled=True, **options):
        return handle_observation(self.state, issues, self.now, enabled=enabled,
                                  sender=lambda *message: self.delivered.append(message),
                                  save=lambda data: self.saved.append(list(data.get("attempts", []))), **options)

    def test_disabled_delivery_never_sends_even_test(self):
        for _ in range(10):
            self.observe(["backup_failed"], enabled=False, test=True)
        self.assertEqual(self.delivered, [])
        self.assertEqual(self.state["attempts"], [])

    def test_healthy_initial_state_does_not_send(self):
        for _ in range(5):
            self.observe([])
        self.assertFalse(self.delivered)

    def test_transient_failure_and_recovery_do_not_send(self):
        self.observe(["api_unavailable"])
        self.observe([])
        self.observe([])
        self.assertFalse(self.delivered)

    def test_sustained_failure_sends_once_then_recovers(self):
        self.observe(["backup_failed"])
        self.observe(["backup_failed"])
        self.assertEqual(len(self.delivered), 1)
        for _ in range(20):
            self.observe(["backup_failed"])
        self.assertEqual(len(self.delivered), 1)
        self.now += 3601
        self.observe([])
        self.observe([])
        self.assertEqual(len(self.delivered), 2)
        self.assertIn("رجعت", self.delivered[-1][0])

    def test_test_message_shares_hourly_and_daily_limits(self):
        for _ in range(5):
            self.observe([], test=True)
            self.now += 3601
        self.assertEqual(len(self.delivered), 3)
        self.now += 86401
        self.observe([], test=True)
        self.assertEqual(len(self.delivered), 4)

    def test_smtp_failure_reserves_attempt_before_transport_and_survives_restart(self):
        def failed_send(*_):
            self.assertEqual(self.saved[-1], [self.now])
            raise OSError("simulated network failure")
        event = handle_observation(self.state, [], self.now, enabled=True, sender=failed_send,
                                   save=lambda data: self.saved.append(list(data.get("attempts", []))), test=True)
        self.assertEqual(event, "email_send_failed")
        # Load the persisted state in a fresh process: failed sends still consume the limiter.
        self.state = {"attempts": list(self.saved[-1])}
        self.observe([], test=True)
        self.assertFalse(self.delivered)

    def test_disabled_observations_do_not_mark_incident_delivered(self):
        self.observe(["backup_failed"], enabled=False)
        self.observe(["backup_failed"], enabled=False)
        self.assertNotIn("notified", self.state)
        self.observe(["backup_failed"])
        self.assertEqual(len(self.delivered), 1)


if __name__ == "__main__":
    unittest.main()
