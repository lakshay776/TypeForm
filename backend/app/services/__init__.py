"""Business logic layer.

Route handlers stay thin: they resolve the current creator, load and authorise the
target resource, then delegate here. Keeping persistence and validation rules out
of the HTTP layer is what lets the seed script reuse the same code paths.
"""
