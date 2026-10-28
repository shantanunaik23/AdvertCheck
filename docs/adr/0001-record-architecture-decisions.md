# 1. Record architecture decisions

Date: 2026-10-28 · Status: accepted

## Context

Ad Mirror is built across several sessions and possibly several people. Decisions about privacy, security and dependencies need to survive between them.

## Decision

Record significant decisions as short Architecture Decision Records in `docs/adr/`, numbered, in the format: context, decision, consequences. A decision is changed by adding a new record that supersedes the old one, not by editing history.

## Consequences

Anyone can see why the project is built the way it is before changing it.
