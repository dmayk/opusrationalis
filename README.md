# Ralph: A Machine-Theological Research Project

This repository contains an autonomous agent-driven exploration of Christian doctrine through adversarial debate and precision mapping of theological disagreement.

## What This Project Does

Ralph builds a living, version-controlled knowledge system that uses large-scale adversarial agent workflows to iteratively interrogate Christian doctrine against its primary sources. The goal is not to produce *the* final answer to contested theological questions, but to produce something no prior effort has had the compute to build: a precise, auditable map of which claims the text genuinely settles, which it settles only *conditional on* declared priors, and which are irreducible axiomatic forks where traditions part ways.

## How It Works

Every day, an autonomous agent runs to advance this project by exactly one meaningful step. It might:
- Define new theological claims for debate
- Run structured debates between different theological positions
- Compose higher-order doctrines from resolved claims
- Improve the website interface for exploring the doctrine graph

All work is version-controlled, reproducible, and transparent.

## Repository Structure

- `PROJECT.md` - The definitive specification for the project (read this first)
- `STATE.md` - Current state and next steps (updated every iteration)
- `schemas/` - JSON schemas defining the data structures
- `corpora/` - Source texts and manifest
- `profiles/` - Hermeneutic profiles declaring interpretive priors
- `claims/` - Atomic theological claims
- `debates/` - Transcripts of adversarial debates
- `graph/` - The composed doctrine graph data
- `site/` - Static website source
- `scripts/` - Automation and validation scripts
- `docs/` - Internal documentation
- `runs/` - Historical run logs

## Learn More

See `PROJECT.md` for the complete technical specification and vision.
