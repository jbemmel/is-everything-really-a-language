# Test Results: english

## Summary

| Metric | Value |
|--------|-------|
| Total Fields Tested | 264 |
| Passed | 198 |
| Failed | 66 |
| Score | 75.0% |
| Duration | 5m 3s |

## Results by Entity

### language_candidates

- Fields: 198/264 (75.0%)
- Computed columns: has_grammar, question, predicted_answer, prediction_predicates, prediction_fail, is_description_of, is_open_closed_world_conflicted, relationship_to_concept

| PK | Field | Expected | Actual |
|-----|-------|----------|--------|
| a-coffee-mug | prediction_predicates | No Syntax & No Parsing Neede & | No Syntax & No Parsing Needed  |
| a-coffee-mug | prediction_fail |  | A Coffee Mug Isn't a Family Fe |
| a-coffee-mug | is_open_closed_world_conflicted | False | True |
| a-game-of-fortnite | prediction_fail |  | A Game of Fortnite Isn't a Fam |
| a-game-of-fortnite | is_open_closed_world_conflicted | False | True |
| a-running-app | prediction_fail |  | A Running App  Isn't a Family  |
| a-running-app | is_open_closed_world_conflicted | False | True |
| a-smartphone | prediction_predicates | No Syntax & No Parsing Neede & | No Syntax & No Parsing Needed  |
| a-smartphone | prediction_fail |  | A Smartphone Isn't a Family Fe |
| a-smartphone | is_open_closed_world_conflicted | False | True |
| a-thunderstorm | prediction_fail |  | A Thunderstorm Isn't a Family  |
| a-thunderstorm | is_open_closed_world_conflicted | False | True |
| a-uml-file | is_open_closed_world_conflicted | False | None |
| an-docx-doc | is_open_closed_world_conflicted | False | None |
| an-xlsx-doc | is_open_closed_world_conflicted | False | None |
| ant-pheromone-trail-system | prediction_predicates | No Syntax & No Parsing Neede & | No Syntax & No Parsing Needed  |
| ant-pheromone-trail-system | prediction_fail |  | Ant Pheromone Trail System Isn |
| ant-pheromone-trail-system | is_open_closed_world_conflicted | False | None |
| ant-pheromone-trail-system | relationship_to_concept | IsDescriptionOf | IsMirrorOf |
| binary-code | is_open_closed_world_conflicted | False | None |
| ... | ... | (46 more) | ... |
