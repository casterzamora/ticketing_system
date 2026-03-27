---
name: backend-development
description: "Use when: creating Laravel models, routes, controllers, migrations, or seeders. Also for service-layer logic and database optimization."
---

# Backend Development Skill

## Standards & Best Practices

- **Routing**: Define API routes in `routes/api.php` and web routes in `routes/web.php`. Use resource controllers where appropriate.
- **Service Layer**: Extract business logic into specialized Service classes in `app/Services/` to keep controllers thin.
- **Database**: Use Eloquent models for ORM. Follow naming conventions for relationships. Define composite indexes for performance.
- **Security**: Implement proper validation in `App\Http\Requests\`. Use Laravel's built-in authentication and authorization (Gates/Policies).
- **Quality**: Write unit and feature tests in `tests/`. Use seeders and factories for reliable test data.
- **Error Handling**: Standardize API responses using Laravel Resources. Use structured exceptions for domain errors.

## Workflow
1. Use `php artisan` for generating boilerplate.
2. Run `php artisan migrate` after defining new schemas.
3. Verify changes with `php artisan test`.
