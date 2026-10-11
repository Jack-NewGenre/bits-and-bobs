export interface SearchPrompt {
  /** Finishes the sentence "I want to…". */
  label: string;
  /** What the search box is filled with when the prompt is picked. */
  query: string;
}

/** Examples typed out as the home page search placeholder, and offered as chips. */
export const SEARCH_PROMPTS: SearchPrompt[] = [
  { label: "remove a background", query: "background" },
  { label: "compress a photo", query: "compress" },
  { label: "merge some PDFs", query: "merge" },
  { label: "make a favicon", query: "favicon" },
  { label: "turn a PNG into an SVG", query: "svg" },
  { label: "generate a UUID", query: "uuid" },
];
