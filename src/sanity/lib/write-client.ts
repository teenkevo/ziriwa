import "server-only";

import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "../env";

// set your write token
const token = process.env.SANITY_API_TOKEN;

if (!token) {
  throw new Error("MISSING SANITY_API_TOKEN");
}

export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Set to false if statically generating pages, using ISR or tag-based revalidation
  token,
});
