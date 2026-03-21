# Contributing to Newscrux

Thank you for your interest in contributing!

## How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/my-feature`
3. **Make** your changes
4. **Ensure** `npm run build` passes with zero errors
5. **Submit** a Pull Request

## Guidelines

- Follow the existing code style and patterns
- Keep files focused — one clear responsibility per file
- All code, comments, and documentation in English
- Test your changes with `npm run dev` before submitting

## Adding a New Language

To add a new language to the notification system:

1. Add a new `LanguagePack` entry in `src/i18n.ts`
2. Add the language code to the `SupportedLanguage` type
3. Add it to the `SUPPORTED_LANGUAGES` array
4. Add or update automated tests for the new language
5. Test with `npm run dev -- --lang=<your-code>`

## Reporting Issues

Please use [GitHub Issues](https://github.com/alicankiraz1/newscrux/issues) to report bugs or suggest features.
