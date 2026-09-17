"""Cost calculation utilities — used by both API and scheduled jobs."""

def monthly_cost(amount: float, frequency: str) -> float:
    factors = {'weekly': 52 / 12, 'monthly': 1.0, 'quarterly': 1 / 3, 'yearly': 1 / 12}
    return float(amount) * factors.get(frequency, 1.0)

def annual_cost(amount: float, frequency: str) -> float:
    factors = {'weekly': 52.0, 'monthly': 12.0, 'quarterly': 4.0, 'yearly': 1.0}
    return float(amount) * factors.get(frequency, 12.0)
