---
name: architecture-development
description: "Use when: defining system design, database schemas, API architecture, event-driven workflows, or cross-cutting concerns (logging, messaging)."
---

# Architecture Development Skill

## Core Principles

- **Single Responsibility (SRP)**: Ensure classes and modules have one reason to change.
- **Open-Closed Principle (OCP)**: Design modules for extension without modification where possible.
- **Liskov Substitution (LSP)**: Subtypes must be substitutable for their base types.
- **Interface Segregation (ISP)**: Create specific interfaces rather than general-purpose ones.
- **Dependency Inversion (DIP)**: Depend on abstractions, not concretions.
- **Scalability**: Design for horizontal scaling. Use jobs (`app/Jobs/`) for long-running processes.

## Architectural Patterns
- Repository Pattern (where beneficial for decoupling).
- Service Object Pattern (for business workflows).
- Event-Driven Architecture (use Laravel's event listeners/subscribers).
- Job Queues (for async processing like email or heavy calculations).

## Technical Strategy
- Maintain a clean `app/Models` directory with minimal logic.
- Manage cross-cutting concerns via Middlewares and Providers.
- Follow the Laravel standard project structure.

## Workflow
1. For large changes, draft a Mermaid diagram to visualize the proposed architecture.
2. Review database migrations for normalization and efficiency.
3. Validate API contracts (RESTful standards).
