# GLAM SDK TypeScript Example

This is a simple TypeScript application demonstrating how to use the GLAM SDK to interact with the GLAM protocol on Solana.

## Prerequisites

- Node.js (v20 or higher)
- pnpm

## Setup

1. Install dependencies:

   ```
   pnpm install
   ```

2. Set up environment variables:

   - Copy `.env.example` to `.env`
   - Configure the following variables in your `.env` file:
     - `ANCHOR_PROVIDER_URL`: Solana RPC endpoint
     - `ANCHOR_WALLET`: Path to your Solana wallet keypair JSON file
     - `GLAM_STATE`: GLAM state account address

3. Build the TypeScript code:
   ```
   pnpm run build
   ```

## Running the Application

Run the compiled application:

```
pnpm start
```

For development:

```
pnpm run dev
```
