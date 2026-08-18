# The Keeper — sprite sheet frame index

Cell size 48x48. Frame N starts at x = N * 48.

| # | Pose | Notes |
| --- | --- | --- |
| 0 | idle | level, tail centred |
| 1 | swim1 | tail beat down |
| 2 | swim2 | rising, body arched |
| 3 | swim3 | tail beat up |
| 4 | swim4 | level, settling |
| 5 | breach | nose up, out of the water |

Swim loop order is 1,2,3,4 at ~7fps. Both ramps share identical grids.
