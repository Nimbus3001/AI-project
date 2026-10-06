import unittest
from backend.bayes.network import infer
from backend.decision.influence import decide

class CoreModelTests(unittest.TestCase):
    def test_posteriors_normalize(self):
        result = infer({'ph': 0.45, 'conductance': 0.58, 'dissolved_oxygen': 0.63, 'temperature': 0.62})
        for distribution in result['posterior'].values():
            self.assertAlmostEqual(sum(distribution.values()), 1.0, places=5)

    def test_decision_is_expected_utility_argmax(self):
        result = infer({'ph': 0.45, 'conductance': 0.58, 'dissolved_oxygen': 0.63, 'temperature': 0.62})
        decision = decide(result['posterior'])
        self.assertEqual(decision['recommendation'], max(decision['utilities'], key=decision['utilities'].get))

    def test_evidence_changes_model_states_and_posterior(self):
        low = infer({'ph': 0.15, 'conductance': 0.15, 'dissolved_oxygen': 0.15, 'temperature': 0.15})
        high = infer({'ph': 0.95, 'conductance': 0.95, 'dissolved_oxygen': 0.95, 'temperature': 0.95})
        self.assertNotEqual(low['states'], high['states'])
        self.assertNotEqual(low['posterior']['overall_risk'], high['posterior']['overall_risk'])

if __name__ == '__main__':
    unittest.main()
