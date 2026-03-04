# Specification Document for Rulebook: PUBLISHED - ERB_semiotics-is-everything-a-language

## Overview
This rulebook provides a structured approach to classify various language candidates based on specific criteria. It includes calculated fields that derive insights from raw data about each candidate, such as whether they have grammar or syntax, and their predicted status as a language. The following sections detail the entities with calculated fields, the input fields required for calculations, and the methods for computing the calculated fields.

---

## Entity: LanguageCandidates

### Input Fields
1. **LanguageCandidateId**
   - **Type:** string
   - **Description:** Unique identifier for the language candidate.

2. **Name**
   - **Type:** string
   - **Description:** Name of the language candidate being classified.

3. **IsLanguage**
   - **Type:** boolean
   - **Description:** Indicates if the candidate is considered a language.

4. **HasSyntax**
   - **Type:** boolean
   - **Description:** Indicates if the language candidate has syntax and/or grammar.

5. **CanBeHeld**
   - **Type:** boolean
   - **Description:** Indicates if the candidate is physical/material.

6. **IsParsed**
   - **Type:** boolean
   - **Description:** Indicates if the knowledge/information requires parsing before meaning can be extracted.

7. **ResolvesToAnAST**
   - **Type:** boolean
   - **Description:** Indicates if the knowledge/information resolves to an Abstract Syntax Tree (AST).

8. **HasLinearDecodingPressure**
   - **Type:** boolean
   - **Description:** Indicates if the candidate has linear decoding pressure.

9. **IsStableOntologyReference**
   - **Type:** boolean
   - **Description:** Indicates if the candidate is a stable ontology reference.

10. **HasIdentity**
    - **Type:** boolean
    - **Description:** Indicates if the candidate can be assigned a globally unique identifier.

11. **DistanceFromConcept**
    - **Type:** integer
    - **Description:** The distance from the core concept being evaluated.

### Calculated Fields

1. **HasGrammar**
   - **Description:** Determines if the candidate has grammar based on the presence of syntax.
   - **Calculation Method:** This field is true if `HasSyntax` is true.
   - **Formula:** `={{HasSyntax}} = TRUE()`
   - **Example:** If `HasSyntax` for "English" is true, then `HasGrammar` will also be true.

2. **Question**
   - **Description:** Forms a question about whether the candidate is a language.
   - **Calculation Method:** The question is constructed by concatenating "Is " with the candidate's name and " a language?".
   - **Formula:** `="Is " & {{Name}} & " a language?"`
   - **Example:** For "English", the question would be "Is English a language?".

3. **PredictedAnswer**
   - **Description:** Predicts if the candidate is likely to be considered a language based on several criteria.
   - **Calculation Method:** This field is true if all of the following conditions are met:
     - HasSyntax is true
     - IsParsed is true
     - IsDescriptionOf is true
     - HasLinearDecodingPressure is true
     - ResolvesToAnAST is true
     - IsStableOntologyReference is true
     - CanBeHeld is false
     - HasIdentity is false
   - **Formula:** `=AND({{HasSyntax}}, {{IsParsed}}, {{IsDescriptionOf}}, {{HasLinearDecodingPressure}}, {{ResolvesToAnAST}}, {{IsStableOntologyReference}}, NOT({{CanBeHeld}}), NOT({{HasIdentity}}))`
   - **Example:** For "English", if all conditions are satisfied, `PredictedAnswer` will be true.

4. **PredictionPredicates**
   - **Description:** Generates a string summarizing the predicates that led to the prediction.
   - **Calculation Method:** Constructs a string based on the boolean values of several predicates.
   - **Formula:** 
     ```
     =IF({{HasSyntax}}, "Has Syntax", "No Syntax") & " & " & 
     IF({{IsParsed}}, "Requires Parsing", "No Parsing Needed") & " & " & 
     IF({{IsDescriptionOf}}, "Describes the thing", "Is the Thing") & " & " & 
     IF({{HasLinearDecodingPressure}}, "Has Linear Decoding Pressure", "No Decoding Pressure") & " & " & 
     IF({{ResolvesToAnAST}}, "Resolves to AST", "No AST") & ", " & 
     IF({{IsStableOntologyReference}}, "Is Stable Ontology", "Not 'Ontology'") & 
     " AND " & 
     IF({{CanBeHeld}}, "Can Be Held", "Can't Be Held") & ", " & 
     IF({{HasIdentity}}, "Has Identity", "Has no Identity")
     ```
   - **Example:** For "English", it might generate: "Has Syntax & Requires Parsing & Describes the thing & Has Linear Decoding Pressure & Resolves to AST, Is Stable Ontology AND Can't Be Held, Has no Identity".

5. **PredictionFail**
   - **Description:** Provides an explanation if the predicted answer does not match the actual status of the candidate.
   - **Calculation Method:** If `PredictedAnswer` does not equal `IsLanguage`, it constructs a message explaining the mismatch.
   - **Formula:** 
     ```
     =IF(NOT({{PredictedAnswer}} = {{IsLanguage}}),
       {{Name}} & " " & IF({{PredictedAnswer}}, "Is", "Isn't") & 
       " a Family Feud Language, but " & 
       IF({{IsLanguage}}, "Is", "Is Not") & 
       " marked as a 'Language Candidate.'", "") & 
       IF({{IsOpenClosedWorldConflicted}}, " - Open World vs. Closed World Conflict.", "")
     ```
   - **Example:** For "A Coffee Mug", if `PredictedAnswer` is false and `IsLanguage` is true, it would produce: "A Coffee Mug Isn't a Family Feud Language, but Is marked as a 'Language Candidate.'".

6. **IsDescriptionOf**
   - **Description:** Indicates if the candidate describes a concept based on its distance from the core concept.
   - **Calculation Method:** This field is true if `DistanceFromConcept` is greater than 1.
   - **Formula:** `={{DistanceFromConcept}} > 1`
   - **Example:** If `DistanceFromConcept` for "English" is 2, then `IsDescriptionOf` will be true.

7. **IsOpenClosedWorldConflicted**
   - **Description:** Indicates if there is a conflict between being classified as both open and closed world.
   - **Calculation Method:** This field is true if both `IsOpenWorld` and `IsClosedWorld` are true.
   - **Formula:** `=AND({{IsOpenWorld}}, {{IsClosedWorld}})`
   - **Example:** If both `IsOpenWorld` and `IsClosedWorld` for "Falsifier A" are true, then `IsOpenClosedWorldConflicted` will be true.

8. **RelationshipToConcept**
   - **Description:** Describes the relationship of the candidate to the core concept based on its distance.
   - **Calculation Method:** If `DistanceFromConcept` is 1, it indicates "IsMirrorOf"; otherwise, it indicates "IsDescriptionOf".
   - **Formula:** `=IF({{DistanceFromConcept}} = 1, "IsMirrorOf", "IsDescriptionOf")`
   - **Example:** For "A Coffee Mug", if `DistanceFromConcept` is 1, it will return "IsMirrorOf".

---

This specification provides a comprehensive guide to understanding and calculating the derived fields for each language candidate in the rulebook. By following the outlined methods and examples, one can accurately compute the values without needing to reference the original formulas directly.