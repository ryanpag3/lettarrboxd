# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Watchlistarr is a TypeScript project currently in early development stage. The repository is configured but contains no source code yet.

## Commands

### Development
- `yarn install` - Install dependencies
- `yarn ts-node src/index.ts` - Run the main TypeScript file directly (once created)
- `yarn nodemon src/index.ts` - Run with auto-reload during development (once created)

### TypeScript
- `yarn tsc` - Compile TypeScript (outputs to current directory based on tsconfig.json)
- `yarn tsc --noEmit` - Type check without emitting files

## Project Structure

The project is set up as a basic TypeScript Node.js application:

- **Entry point**: `src/index.ts` (defined in package.json but not yet created)
- **TypeScript config**: Standard configuration with strict mode enabled, targeting ES2016 with CommonJS modules
- **Package manager**: Yarn (yarn.lock present)

## Key Dependencies

- **nodemon**: Development tool for auto-reloading during development
- **ts-node**: TypeScript execution environment for Node.js
- **typescript**: TypeScript compiler

## Architecture Notes

The project structure is minimal and ready for initial development. The main entry point should be created at `src/index.ts`. TypeScript is configured with strict type checking enabled.