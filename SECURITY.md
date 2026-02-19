# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in JalSeva, **please do not open a public issue**.

Instead, report it responsibly:

1. **Email:** Send details to **divyamohan1993@gmail.com** with the subject line `[SECURITY] JalSeva Vulnerability Report`.
2. Include:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgement:** Within 48 hours
- **Initial assessment:** Within 5 business days
- **Fix & disclosure:** Coordinated with the reporter

## Scope

The following are in scope:

- The JalSeva web application (`jalseva/` directory)
- API routes and server-side logic
- Authentication and authorization flows
- Payment processing logic
- Data exposure or injection vulnerabilities

The following are **out of scope**:

- Third-party services (Firebase, Google Maps, Razorpay) — report directly to those providers
- Social engineering attacks
- Denial of service attacks

## Best Practices

When contributing code, please:

- Never commit API keys, secrets, or credentials
- Use environment variables for all sensitive configuration
- Validate and sanitize all user input
- Follow the [OWASP Top 10](https://owasp.org/www-project-top-ten/) guidelines

Thank you for helping keep JalSeva secure.
