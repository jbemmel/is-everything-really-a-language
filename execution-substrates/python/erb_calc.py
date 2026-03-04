"""
ERB Calculation Library (GENERATED - DO NOT EDIT)
=================================================
Generated from: effortless-rulebook/effortless-rulebook.json

This file contains pure functions that compute calculated fields
from raw field values. Supports multiple entities.
"""

from typing import Optional, Any


# =============================================================================
# LANGUAGECANDIDATES CALCULATIONS
# =============================================================================

# Level 1

def calc_language_candidates_has_grammar(has_syntax):
    """Formula: ={{HasSyntax}} = TRUE()"""
    return (has_syntax == True)

def calc_language_candidates_question(name):
    """Formula: ="Is " & {{Name}} & " a language?" """
    return ('Is ' + str(name or "") + ' a language?')

def calc_language_candidates_is_description_of(distance_from_concept):
    """Formula: ={{DistanceFromConcept}} > 1"""
    return (distance_from_concept > 1)

def calc_language_candidates_is_open_closed_world_conflicted(is_open_world, is_closed_world):
    """Formula: =AND({{IsOpenWorld}}, {{IsClosedWorld}})"""
    return ((is_open_world is True) and (is_closed_world is True))

def calc_language_candidates_relationship_to_concept(distance_from_concept):
    """Formula: =IF({{DistanceFromConcept}} = 1, "IsMirrorOf", "IsDescriptionOf")"""
    return ('IsMirrorOf' if (distance_from_concept == 1) else 'IsDescriptionOf')

# Level 2

def calc_language_candidates_predicted_answer(has_syntax, is_parsed, is_description_of, has_linear_decoding_pressure, resolves_to_an_ast, is_stable_ontology_reference, can_be_held, has_identity):
    """Formula: =AND(
  {{HasSyntax}},
  {{IsParsed}},
  {{IsDescriptionOf}},
  {{HasLinearDecodingPressure}},
  {{ResolvesToAnAST}},
  {{IsStableOntologyReference}},
  NOT({{CanBeHeld}}),
  NOT({{HasIdentity}})
)"""
    return ((has_syntax is True) and (is_parsed is True) and (is_description_of is True) and (has_linear_decoding_pressure is True) and (resolves_to_an_ast is True) and (is_stable_ontology_reference is True) and (can_be_held is not True) and (has_identity is not True))

def calc_language_candidates_prediction_predicates(has_syntax, is_parsed, is_description_of, has_linear_decoding_pressure, resolves_to_an_ast, is_stable_ontology_reference, can_be_held, has_identity):
    """Formula: =IF({{HasSyntax}}, "Has Syntax", "No Syntax") & " & " & IF({{IsParsed}}, "Requires Parsing", "No Parsing Neede") & " & " & IF({{IsDescriptionOf}}, "Describes the thing", "Is the Thing") & " & " & IF({{HasLinearDecodingPressure}}, "Has Linear Decoding Pressure", "No Decoding Pressure") & " & " & IF({{ResolvesToAnAST}}, "Resolves to AST", "No AST") & ", " & IF({{IsStableOntologyReference}}, "Is Stable Ontology", "Not 'Ontology'") & " AND " & IF({{CanBeHeld}}, "Can Be Held", "Can't Be Held") & ", " &IF({{HasIdentity}}, "Has Identity", "Has no Identity")"""
    return (str(('Has Syntax' if has_syntax else 'No Syntax') if ('Has Syntax' if has_syntax else 'No Syntax') is not None else "") + ' & ' + str(('Requires Parsing' if is_parsed else 'No Parsing Neede') if ('Requires Parsing' if is_parsed else 'No Parsing Neede') is not None else "") + ' & ' + str(('Describes the thing' if is_description_of else 'Is the Thing') if ('Describes the thing' if is_description_of else 'Is the Thing') is not None else "") + ' & ' + str(('Has Linear Decoding Pressure' if has_linear_decoding_pressure else 'No Decoding Pressure') if ('Has Linear Decoding Pressure' if has_linear_decoding_pressure else 'No Decoding Pressure') is not None else "") + ' & ' + str(('Resolves to AST' if resolves_to_an_ast else 'No AST') if ('Resolves to AST' if resolves_to_an_ast else 'No AST') is not None else "") + ', ' + str(('Is Stable Ontology' if is_stable_ontology_reference else "Not 'Ontology'") if ('Is Stable Ontology' if is_stable_ontology_reference else "Not 'Ontology'") is not None else "") + ' AND ' + str(('Can Be Held' if can_be_held else "Can't Be Held") if ('Can Be Held' if can_be_held else "Can't Be Held") is not None else "") + ', ' + str(('Has Identity' if has_identity else 'Has no Identity') if ('Has Identity' if has_identity else 'Has no Identity') is not None else ""))

# Level 3

def calc_language_candidates_prediction_fail(predicted_answer, is_language, name, is_open_closed_world_conflicted):
    """Formula: =IF(NOT({{PredictedAnswer}} = {{IsLanguage}}),
  {{Name}} & " " & IF({{PredictedAnswer}}, "Is", "Isn't") & " a Family Feud Language, but " & 
  IF({{IsLanguage}}, "Is", "Is Not") & " marked as a 'Language Candidate.'", "") & IF({{IsOpenClosedWorldConflicted}}, " - Open World vs. Closed World Conflict.", "")"""
    return (str(((str(name or "") + ' ' + str(('Is' if predicted_answer else "Isn't") if ('Is' if predicted_answer else "Isn't") is not None else "") + ' a Family Feud Language, but ' + str(('Is' if is_language else 'Is Not') if ('Is' if is_language else 'Is Not') is not None else "") + " marked as a 'Language Candidate.'") if (not (predicted_answer == is_language)) else '') if ((str(name or "") + ' ' + str(('Is' if predicted_answer else "Isn't") if ('Is' if predicted_answer else "Isn't") is not None else "") + ' a Family Feud Language, but ' + str(('Is' if is_language else 'Is Not') if ('Is' if is_language else 'Is Not') is not None else "") + " marked as a 'Language Candidate.'") if (not (predicted_answer == is_language)) else '') is not None else "") + str((' - Open World vs. Closed World Conflict.' if is_open_closed_world_conflicted else '') if (' - Open World vs. Closed World Conflict.' if is_open_closed_world_conflicted else '') is not None else ""))


def compute_language_candidates_fields(record: dict) -> dict:
    """Compute all calculated fields for LanguageCandidates."""
    result = dict(record)

    # Level 1 calculations
    result['has_grammar'] = calc_language_candidates_has_grammar(result.get('has_syntax'))
    result['question'] = calc_language_candidates_question(result.get('name'))
    result['is_description_of'] = calc_language_candidates_is_description_of(result.get('distance_from_concept'))
    result['is_open_closed_world_conflicted'] = calc_language_candidates_is_open_closed_world_conflicted(result.get('is_open_world'), result.get('is_closed_world'))
    result['relationship_to_concept'] = calc_language_candidates_relationship_to_concept(result.get('distance_from_concept'))

    # Level 2 calculations
    result['predicted_answer'] = calc_language_candidates_predicted_answer(result.get('has_syntax'), result.get('is_parsed'), result.get('is_description_of'), result.get('has_linear_decoding_pressure'), result.get('resolves_to_an_ast'), result.get('is_stable_ontology_reference'), result.get('can_be_held'), result.get('has_identity'))
    result['prediction_predicates'] = calc_language_candidates_prediction_predicates(result.get('has_syntax'), result.get('is_parsed'), result.get('is_description_of'), result.get('has_linear_decoding_pressure'), result.get('resolves_to_an_ast'), result.get('is_stable_ontology_reference'), result.get('can_be_held'), result.get('has_identity'))

    # Level 3 calculations
    result['prediction_fail'] = calc_language_candidates_prediction_fail(result.get('predicted_answer'), result.get('is_language'), result.get('name'), result.get('is_open_closed_world_conflicted'))

    # Convert empty strings to None for string fields
    for key in ['question', 'prediction_predicates', 'prediction_fail', 'relationship_to_concept']:
        if result.get(key) == '':
            result[key] = None

    return result


# =============================================================================
# DISPATCHER FUNCTION
# =============================================================================

def compute_all_calculated_fields(record: dict, entity_name: str = None) -> dict:
    """
    Compute all calculated fields for a record.
    
    Args:
        record: The record dict with raw field values
        entity_name: Entity name (snake_case or PascalCase)
    
    Returns:
        Record dict with calculated fields filled in
    """
    if entity_name is None:
        # Try to infer from record keys
        return dict(record)

    # Normalize to snake_case
    entity_lower = entity_name.lower().replace('-', '_')

    if entity_lower == 'language_candidates':
        return compute_language_candidates_fields(record)
    else:
        # Unknown entity, return as-is
        return dict(record)