---
id: frameworks/flutter
name: Flutter Patterns
version: "1.0.0"
description: Flutter patterns for widgets, state management, and testing.
language: dart
tags: [flutter, dart, mobile, ui]
depends_on: [languages/dart]
capabilities: [widgets, state-management, navigation]
parameters: []
tools: []
constraints: []
---

# Flutter Patterns

Building cross-platform apps with Flutter widgets, state management, and testing.

## Widget Composition

- Small, focused widgets. Extract subtrees when they grow beyond one screen or need reuse.
- Prefer `const` constructors everywhere they work — they bypass rebuilds.
- Stateless widgets first; only reach for StatefulWidget when local mutable state is needed.

## State Management

- Local state: `StatefulWidget` or `ValueNotifier` for simple cases.
- App state: Riverpod (recommended), Bloc, or Provider.
- Keep one approach per app. Riverpod's `Notifier`/`AsyncNotifier` give strong typing and testability.

```dart
class CounterNotifier extends Notifier<int> {
  @override
  int build() => 0;
  void increment() => state++;
}
final counterProvider = NotifierProvider<CounterNotifier, int>(CounterNotifier.new);
```

## Navigation

- `go_router` for declarative, URL-based routing (deep links, web).
- Avoid named-routes string constants; wrap routes in typed helpers.

## Async UI

- `FutureBuilder`/`StreamBuilder` for ad-hoc async; prefer state-management async types for shared data.
- Show loading, error, and empty states explicitly — don't rely on spinners alone.
- Guard `setState` with `if (mounted)` after awaits.

## Performance

- `const` widgets skip rebuilds.
- `RepaintBoundary` around expensive subtrees.
- `ListView.builder` for long lists; avoid building everything upfront.
- Profile with DevTools; watch for jank in the raster thread.

## Theming

- Single `ThemeData` in `MaterialApp`; use `Theme.of(context)` throughout.
- Design tokens centralized; avoid literal colors/sizes in widgets.

## Platform Integration

- Method channels for native functionality; wrap in a Dart API.
- Use federated plugins; avoid one-off platform code when a plugin exists.

## Testing

- Widget tests with `flutter_test`; pump and tap widgets, assert on finders.
- Golden tests for pixel-level regressions (watch font/rendering differences per platform).
- Integration tests with `integration_test` package.

## Localization

- `flutter_localizations` + `.arb` files; generate with `flutter gen-l10n`.
- Externalize every user-visible string from day one.

## Common Pitfalls

- Calling setState after dispose.
- Building widgets in build methods of parents — extract to separate widgets.
- Overly deep widget trees hurting readability; extract ruthlessly.
- Platform-specific code without fallbacks.
