import { z } from "zod";

export const RubricSourceSchema = z.enum([
  "claims_pass_rate",
  "provenance.in_window_ratio",
  "tracks.devin_role",
  "review.summary_score",
  "security",
]);

export const RubricDimensionSchema = z.object({
  id: z.string(),
  label: z.string(),
  weight: z.number(),
  source: z.string(),
});

export const RubricSchema = z.object({
  dimensions: z.array(RubricDimensionSchema).min(1),
});

export const DEFAULT_RUBRIC: z.infer<typeof RubricSchema> = {
  dimensions: [
    { id: "works", label: "It works", weight: 35, source: "claims_pass_rate" },
    {
      id: "provenance",
      label: "Built during event",
      weight: 20,
      source: "provenance.in_window_ratio",
    },
    {
      id: "devin_role",
      label: "Devin role",
      weight: 20,
      source: "tracks.devin_role",
    },
    {
      id: "quality",
      label: "Code quality",
      weight: 15,
      source: "review.summary_score",
    },
    {
      id: "security",
      label: "Security hygiene",
      weight: 10,
      source: "security",
    },
  ],
};

export type Rubric = z.infer<typeof RubricSchema>;
export type RubricDimension = z.infer<typeof RubricDimensionSchema>;

export function rubricWeightsSum(rubric: Rubric): number {
  return rubric.dimensions.reduce((sum, d) => sum + d.weight, 0);
}
