import { Pinecone } from "@pinecone-database/pinecone";

// We check if the key exists to avoid crashing on the client side if somehow this is imported
// NextJS API routes (Server-side) will be the primary users of this.
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string,
});

export const getPineconeIndex = () => {
    return pinecone.Index(process.env.PINECONE_INDEX_NAME as string);
};

export default pinecone;
