# `ng build` hangs after a successful build on `@angular/build` 21.2.14–21.2.18

Minimal reproduction, built from a plain `ng new` scaffold. Two commits:

1. `initial commit` — untouched `ng new` output. Builds fine.
2. `Add minimal trigger...` — adds one unused file that makes `ng build` hang.

## Reproducing

```bash
npm install
npx ng build
```

The build finishes ("Application bundle generation complete") and then never exits.
Check `ps aux | grep esbuild` in another terminal — you'll find a stuck
`esbuild --service --ping` process alongside the still-running `ng build`. Both need
to be killed by hand.

Reproduces reliably, including after a clean `rm -rf node_modules package-lock.json &&
npm install`. Pinning `@angular/build`/`@angular/cli` to `21.2.13` fixes it with the
same source file.

## Root cause

angular/angular-cli [#33267](https://github.com/angular/angular-cli/pull/33267) (in
`@angular/build` since 21.2.14) switched one-shot builds from a plain `esbuild.build()`
call to `esbuild.context()` + `.rebuild()` — the persistent-IPC path normally used for
watch mode. That fixed a real leak
([#33201](https://github.com/angular/angular-cli/issues/33201)), but it introduced this
hang, already reported as
[#33480](https://github.com/angular/angular-cli/issues/33480) and closed because the
maintainers couldn't reproduce it from the description given.

## What triggers it

`styled-items.component.ts` has two trivial components, each with an inline `styles:`
block:

```ts
@Component({
  selector: 'app-styled-a',
  template: `<ng-content />`,
  styles: `:host { display: block; }`,
})
export class StyledAComponent {}
```

- Two components with inline styles hang it. One is clean. It's the count that
  matters, not any single component.
- The CSS content doesn't matter — the trivial `:host { display: block; }` above
  hangs it just as reliably as more elaborate CSS.
- Host bindings, signals, file size, and everything else in the app are irrelevant.
- No third-party packages needed, just stock `@angular/*`.
- The file doesn't need to be imported or routed anywhere. It just needs to exist
  somewhere `tsconfig.app.json`'s `include: ["src/**/*.ts"]` picks up.

My best guess: each inline `styles:` block spins up a separate CSS-transform task on
the esbuild/LightningCSS IPC child that #33267 introduced. Two or more of those
running at once seems to open a race in the teardown, and the service process's
disposal ping never lands.

## Environment

- `@angular/build`/`@angular/cli`: `^21.2.18` (also 21.2.14–21.2.17; clean on `21.2.13`)
- Reproduced on macOS (arm64); not tested on Linux/Windows yet
