import * as sdk from 'node-appwrite'

export const { APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_ENDPOINT } =
  process.env

const client = new sdk.Client()

client
  .setEndpoint(APPWRITE_ENDPOINT!)
  .setProject(APPWRITE_PROJECT_ID!)
  .setKey(APPWRITE_API_KEY!)

export const databases = new sdk.Databases(client)
