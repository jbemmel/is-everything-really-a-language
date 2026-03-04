// ERB SDK - Go Implementation (GENERATED - DO NOT EDIT)
// ======================================================
// Generated from: effortless-rulebook/effortless-rulebook.json
//
// This file contains structs and calculation functions
// for all tables defined in the rulebook.

package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// boolVal safely dereferences a *bool, returning false if nil
func boolVal(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

// stringVal safely dereferences a *string, returning "" if nil
func stringVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// nilIfEmpty returns nil for empty strings, otherwise a pointer to the string
func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// intToString safely converts a *int to string, returning "" if nil
func intToString(i *int) string {
	if i == nil {
		return ""
	}
	return strconv.Itoa(*i)
}

// boolToString converts a bool to "true" or "false"
func boolToString(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

// =============================================================================
// LANGUAGECANDIDATES TABLE
// =============================================================================

// LanguageCandidate represents a row in the LanguageCandidates table
type LanguageCandidate struct {
	LanguageCandidateId string `json:"language_candidate_id"`
	Name *string `json:"name"`
	IsLanguage *bool `json:"is_language"`
	HasSyntax *bool `json:"has_syntax"`
	CanBeHeld *bool `json:"can_be_held"`
	Category *string `json:"category"`
	HasIdentity *bool `json:"has_identity"`
	IsParsed *bool `json:"is_parsed"`
	ResolvesToAnAST *bool `json:"resolves_to_an_ast"`
	HasLinearDecodingPressure *bool `json:"has_linear_decoding_pressure"`
	IsStableOntologyReference *bool `json:"is_stable_ontology_reference"`
	IsLiveOntologyEditor *bool `json:"is_live_ontology_editor"`
	IsOpenWorld *bool `json:"is_open_world"`
	IsClosedWorld *bool `json:"is_closed_world"`
	DistanceFromConcept *int `json:"distance_from_concept"`
	DimensionalityWhileEditing *string `json:"dimensionality_while_editing"`
	ModelObjectFacilityLayer *string `json:"model_object_facility_layer"`
	SortOrder *int `json:"sort_order"`
	HasGrammar *bool `json:"has_grammar"`
	Question *string `json:"question"`
	PredictedAnswer *bool `json:"predicted_answer"`
	PredictionPredicates *string `json:"prediction_predicates"`
	PredictionFail *string `json:"prediction_fail"`
	IsDescriptionOf *bool `json:"is_description_of"`
	IsOpenClosedWorldConflicted *bool `json:"is_open_closed_world_conflicted"`
	RelationshipToConcept *string `json:"relationship_to_concept"`
}

// --- Individual Calculation Functions ---

// CalcHasGrammar computes the HasGrammar calculated field
// Formula: ={{HasSyntax}} = TRUE()
func (tc *LanguageCandidate) CalcHasGrammar() bool {
	return (boolVal(tc.HasSyntax) == true)
}

// CalcQuestion computes the Question calculated field
// Formula: ="Is " & {{Name}} & " a language?"
func (tc *LanguageCandidate) CalcQuestion() string {
	return "Is " + stringVal(tc.Name) + " a language?"
}

// CalcPredictedAnswer computes the PredictedAnswer calculated field
// Formula: =AND(   {{HasSyntax}},   {{IsParsed}},   {{IsDescriptionOf}},   {{HasLinearDecodingPressure}},   {{ResolvesToAnAST}},   {{IsStableOntologyReference}},   NOT({{CanBeHeld}}),   NOT({{HasIdentity}}) )
func (tc *LanguageCandidate) CalcPredictedAnswer() bool {
	return (boolVal(tc.HasSyntax) && boolVal(tc.IsParsed) && boolVal(tc.IsDescriptionOf) && boolVal(tc.HasLinearDecodingPressure) && boolVal(tc.ResolvesToAnAST) && boolVal(tc.IsStableOntologyReference) && !boolVal(tc.CanBeHeld) && !boolVal(tc.HasIdentity))
}

// CalcPredictionPredicates computes the PredictionPredicates calculated field
// Formula: =IF({{HasSyntax}}, "Has Syntax", "No Syntax") & " & " & IF({{IsParsed}}, "Requires Parsing", "No Parsing Neede") & " & " & IF({{IsDescriptionOf}}, "Describes the thing", "Is the Thing") & " & " & IF({{HasLinearDecodingPressure}}, "Has Linear Decoding Pressure", "No Decoding Pressure") & " & " & IF({{ResolvesToAnAST}}, "Resolves to AST", "No AST") & ", " & IF({{IsStableOntologyReference}}, "Is Stable Ontology", "Not 'Ontology'") & " AND " & IF({{CanBeHeld}}, "Can Be Held", "Can't Be Held") & ", " &IF({{HasIdentity}}, "Has Identity", "Has no Identity")
func (tc *LanguageCandidate) CalcPredictionPredicates() string {
	return func() string { if boolVal(tc.HasSyntax) { return "Has Syntax" }; return "No Syntax" }() + " & " + func() string { if boolVal(tc.IsParsed) { return "Requires Parsing" }; return "No Parsing Neede" }() + " & " + func() string { if boolVal(tc.IsDescriptionOf) { return "Describes the thing" }; return "Is the Thing" }() + " & " + func() string { if boolVal(tc.HasLinearDecodingPressure) { return "Has Linear Decoding Pressure" }; return "No Decoding Pressure" }() + " & " + func() string { if boolVal(tc.ResolvesToAnAST) { return "Resolves to AST" }; return "No AST" }() + ", " + func() string { if boolVal(tc.IsStableOntologyReference) { return "Is Stable Ontology" }; return "Not 'Ontology'" }() + " AND " + func() string { if boolVal(tc.CanBeHeld) { return "Can Be Held" }; return "Can't Be Held" }() + ", " + func() string { if boolVal(tc.HasIdentity) { return "Has Identity" }; return "Has no Identity" }()
}

// CalcPredictionFail computes the PredictionFail calculated field
// Formula: =IF(NOT({{PredictedAnswer}} = {{IsLanguage}}),   {{Name}} & " " & IF({{PredictedAnswer}}, "Is", "Isn't") & " a Family Feud Language, but " &    IF({{IsLanguage}}, "Is", "Is Not") & " marked as a 'Language Candidate.'", "") & IF({{IsOpenClosedWorldConflicted}}, " - Open World vs. Closed World Conflict.", "")
func (tc *LanguageCandidate) CalcPredictionFail() string {
	return func() string { if !((boolVal(tc.PredictedAnswer) == boolVal(tc.IsLanguage))) { return stringVal(tc.Name) + " " + func() string { if boolVal(tc.PredictedAnswer) { return "Is" }; return "Isn't" }() + " a Family Feud Language, but " + func() string { if boolVal(tc.IsLanguage) { return "Is" }; return "Is Not" }() + " marked as a 'Language Candidate.'" }; return "" }() + func() string { if boolVal(tc.IsOpenClosedWorldConflicted) { return " - Open World vs. Closed World Conflict." }; return "" }()
}

// CalcIsDescriptionOf computes the IsDescriptionOf calculated field
// Formula: ={{DistanceFromConcept}} > 1
func (tc *LanguageCandidate) CalcIsDescriptionOf() bool {
	return (tc.DistanceFromConcept != nil && *tc.DistanceFromConcept > 1)
}

// CalcIsOpenClosedWorldConflicted computes the IsOpenClosedWorldConflicted calculated field
// Formula: =AND({{IsOpenWorld}}, {{IsClosedWorld}})
func (tc *LanguageCandidate) CalcIsOpenClosedWorldConflicted() bool {
	return (boolVal(tc.IsOpenWorld) && boolVal(tc.IsClosedWorld))
}

// CalcRelationshipToConcept computes the RelationshipToConcept calculated field
// Formula: =IF({{DistanceFromConcept}} = 1, "IsMirrorOf", "IsDescriptionOf")
func (tc *LanguageCandidate) CalcRelationshipToConcept() string {
	return func() string { if (tc.DistanceFromConcept != nil && *tc.DistanceFromConcept == 1) { return "IsMirrorOf" }; return "IsDescriptionOf" }()
}

// --- Compute All Calculated Fields ---

// ComputeAll computes all calculated fields and returns an updated struct
func (tc *LanguageCandidate) ComputeAll() *LanguageCandidate {
	// Level 1 calculations
	hasGrammar := (boolVal(tc.HasSyntax) == true)
	question := "Is " + stringVal(tc.Name) + " a language?"
	isDescriptionOf := (tc.DistanceFromConcept != nil && *tc.DistanceFromConcept > 1)
	isOpenClosedWorldConflicted := (boolVal(tc.IsOpenWorld) && boolVal(tc.IsClosedWorld))
	relationshipToConcept := func() string { if (tc.DistanceFromConcept != nil && *tc.DistanceFromConcept == 1) { return "IsMirrorOf" }; return "IsDescriptionOf" }()

	// Level 2 calculations
	predictedAnswer := (boolVal(tc.HasSyntax) && boolVal(tc.IsParsed) && isDescriptionOf && boolVal(tc.HasLinearDecodingPressure) && boolVal(tc.ResolvesToAnAST) && boolVal(tc.IsStableOntologyReference) && !boolVal(tc.CanBeHeld) && !boolVal(tc.HasIdentity))
	predictionPredicates := func() string { if boolVal(tc.HasSyntax) { return "Has Syntax" }; return "No Syntax" }() + " & " + func() string { if boolVal(tc.IsParsed) { return "Requires Parsing" }; return "No Parsing Neede" }() + " & " + func() string { if isDescriptionOf { return "Describes the thing" }; return "Is the Thing" }() + " & " + func() string { if boolVal(tc.HasLinearDecodingPressure) { return "Has Linear Decoding Pressure" }; return "No Decoding Pressure" }() + " & " + func() string { if boolVal(tc.ResolvesToAnAST) { return "Resolves to AST" }; return "No AST" }() + ", " + func() string { if boolVal(tc.IsStableOntologyReference) { return "Is Stable Ontology" }; return "Not 'Ontology'" }() + " AND " + func() string { if boolVal(tc.CanBeHeld) { return "Can Be Held" }; return "Can't Be Held" }() + ", " + func() string { if boolVal(tc.HasIdentity) { return "Has Identity" }; return "Has no Identity" }()

	// Level 3 calculations
	predictionFail := func() string { if !((predictedAnswer == boolVal(tc.IsLanguage))) { return stringVal(tc.Name) + " " + func() string { if predictedAnswer { return "Is" }; return "Isn't" }() + " a Family Feud Language, but " + func() string { if boolVal(tc.IsLanguage) { return "Is" }; return "Is Not" }() + " marked as a 'Language Candidate.'" }; return "" }() + func() string { if isOpenClosedWorldConflicted { return " - Open World vs. Closed World Conflict." }; return "" }()

	return &LanguageCandidate{
		LanguageCandidateId: tc.LanguageCandidateId,
		Name: tc.Name,
		IsLanguage: tc.IsLanguage,
		HasSyntax: tc.HasSyntax,
		CanBeHeld: tc.CanBeHeld,
		Category: tc.Category,
		HasIdentity: tc.HasIdentity,
		IsParsed: tc.IsParsed,
		ResolvesToAnAST: tc.ResolvesToAnAST,
		HasLinearDecodingPressure: tc.HasLinearDecodingPressure,
		IsStableOntologyReference: tc.IsStableOntologyReference,
		IsLiveOntologyEditor: tc.IsLiveOntologyEditor,
		IsOpenWorld: tc.IsOpenWorld,
		IsClosedWorld: tc.IsClosedWorld,
		DistanceFromConcept: tc.DistanceFromConcept,
		DimensionalityWhileEditing: tc.DimensionalityWhileEditing,
		ModelObjectFacilityLayer: tc.ModelObjectFacilityLayer,
		SortOrder: tc.SortOrder,
		HasGrammar: &hasGrammar,
		Question: nilIfEmpty(question),
		PredictedAnswer: &predictedAnswer,
		PredictionPredicates: nilIfEmpty(predictionPredicates),
		PredictionFail: nilIfEmpty(predictionFail),
		IsDescriptionOf: &isDescriptionOf,
		IsOpenClosedWorldConflicted: &isOpenClosedWorldConflicted,
		RelationshipToConcept: nilIfEmpty(relationshipToConcept),
	}
}

// =============================================================================
// ISEVERYTHINGALANGUAGE TABLE
// =============================================================================

// IsEverythingALanguage represents a row in the IsEverythingALanguage table
type IsEverythingALanguage struct {
	IsEverythingALanguageId string `json:"is_everything_a_language_id"`
	Name *string `json:"name"`
	ArgumentName *string `json:"argument_name"`
	ArgumentCategory *string `json:"argument_category"`
	StepType *string `json:"step_type"`
	Statement *string `json:"statement"`
	Formalization *string `json:"formalization"`
	RelatedCandidateName *string `json:"related_candidate_name"`
	RelatedCandidateId *string `json:"related_candidate_id"`
	EvidenceFromRulebook *string `json:"evidence_from_rulebook"`
	Notes *string `json:"notes"`
}

// =============================================================================
// ERBCUSTOMIZATIONS TABLE
// =============================================================================

// ERBCustomization represents a row in the ERBCustomizations table
type ERBCustomization struct {
	ERBCustomizationId string `json:"erb_customization_id"`
	Name *string `json:"name"`
	Title *string `json:"title"`
	SQLCode *string `json:"sql_code"`
	SQLTarget *string `json:"sql_target"`
	CustomizationType *string `json:"customization_type"`
}

// =============================================================================
// FILE I/O FUNCTIONS (for all tables with calculated fields)
// =============================================================================

// LoadLanguageCandidateRecords loads LanguageCandidates records from a JSON file
func LoadLanguageCandidateRecords(path string) ([]LanguageCandidate, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	var records []LanguageCandidate
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, fmt.Errorf("failed to parse file: %w", err)
	}

	return records, nil
}

// SaveLanguageCandidateRecords saves computed LanguageCandidates records to a JSON file
func SaveLanguageCandidateRecords(path string, records []LanguageCandidate) error {
	data, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal records: %w", err)
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write records: %w", err)
	}

	return nil
}
