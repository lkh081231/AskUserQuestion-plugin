# Plugin UI changelog

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> Latest updates to plugin UI compatibility APIs and ChatGPT extensions.

## Stable OAuth callbacks and CIMD client IDs

- Date: 2026-08-21
- Products: Plugins

## Changes
- ChatGPT apps can use the stable OAuth callback `https://chatgpt.com/connector_platform_oauth_redirect` when their protected resource and OAuth metadata identify the same authorization server and that server supports [RFC 9207 issuer identification](https://www.rfc-editor.org/rfc/rfc9207.html).
- Apps using Client ID Metadata Documents (CIMD) can also use `https://chatgpt.com/oauth/client.json` as a stable client ID. Servers without issuer support retain their existing callback behavior. [Learn more](https://developers.openai.com/plugins/build/auth#protect-callbacks-with-issuer-identification).

## Legacy tool visibility metadata deprecated

- Date: 2026-07-21
- Products: Plugins

## Changes
- Deprecated `_meta["openai/visibility"]` because its `private` value hides a tool from the model without specifying app visibility, which can make the intended audience unclear. Use `_meta.ui.visibility` to choose whether a tool is available to the model, the app, or both.

## App permission controls in ChatGPT

- Date: 2026-06-12
- Products: Plugins

## Changes
- ChatGPT users can now choose when connected apps ask for permission: always, before making changes, or only before important changes. Personal accounts can set global and per-app preferences, while Business and Enterprise admins control workspace and per-app defaults.

## MCP Apps host style variables

- Date: 2026-05-28
- Products: Plugins

## Changes
- ChatGPT now provides standardized MCP Apps host CSS variables through `hostContext.styles.variables` during initialization and updates them through `ui/notifications/host-context-changed` when the host theme changes, helping apps match ChatGPT's light and dark appearance without hardcoded host-specific colors.

## MCP Apps tool lifecycle updates

- Date: 2026-05-27
- Products: Plugins

## Changes
- `window.openai.toolResponseMetadata` now preserves the canonical MCP tool result envelope, including hidden `_meta`, when ChatGPT launches widgets.
- For tools that need user approval, ChatGPT now delivers widget tool input through the MCP Apps `ui/notifications/tool-input` lifecycle after approval instead of preloading it into the initial widget globals.

## MCP server instructions

- Date: 2026-05-26
- Products: Plugins

## Changes
- ChatGPT now reads MCP server instructions returned during initialization and uses them alongside tool metadata to understand cross-tool workflows, constraints, and server-wide guidance.

## Output schema examples

- Date: 2026-05-06
- Products: Plugins

## Changes
- Plugin UI and MCP server docs now show `outputSchema` in tool examples and recommend declaring one for tools that return structured content.

## Plugin distribution guidance

- Date: 2026-03-25
- Products: Plugins

## Changes
- Approved Apps SDK integrations could be distributed as Codex plugins. At launch, plugins were available only in Codex.

## File library helpers in window.openai

- Date: 2026-03-24
- Products: Plugins

## Changes
- `window.openai.selectFiles()` lets widgets pick existing files from the user's ChatGPT file library when that library is available.
- `window.openai.uploadFile(file, { library: true })` lets widgets save uploads into the user's ChatGPT file library when that library is available.

## Non-image file uploads

- Date: 2026-03-09
- Products: Plugins

## Changes
- `window.openai.uploadFile` now supports non-image file types.

## MCP Apps compatibility

- Date: 2026-02-22
- Products: Plugins

## Changes
- ChatGPT is now fully compatible with the [MCP Apps spec](https://apps.extensions.modelcontextprotocol.io/api/).

## Plugin UI updates for redirects, widget descriptions, and follow-up scrolling

- Date: 2026-02-02
- Products: Plugins

## Changes
- `window.openai.openExternal({ href, redirectUrl })` supports `redirectUrl: false`, which prevents the host from appending `?redirectUrl=...` to external links.
- `window.openai.setOpenInAppUrl({ href })` is the supported way to override the fullscreen "Open in <App>" destination; if you do not call it, ChatGPT keeps opening the widget's current iframe path.
- `openai/widgetDescription` is honored during resource construction and takes precedence over `resource.description` when present.
- `window.openai.sendFollowUpMessage` supports a `scrollToBottom` parameter; it defaults to `true`, and you can pass `false` to opt out.

## Company knowledge compatibility guidance

- Date: 2026-01-21
- Products: Plugins

## Changes
- Added [company knowledge in ChatGPT](https://openai.com/index/introducing-company-knowledge/) compatibility guidance for the `search`/`fetch` tools. [Click here to learn more](https://developers.openai.com/plugins/build/mcp-server#company-knowledge-compatibility).

## Session metadata for tool calls & requestModal template switching

- Date: 2026-01-15
- Products: Plugins

## Changes
- Tool calls now include `_meta["openai/session"]`, an anonymized conversation id you can use to correlate requests within a ChatGPT session.
- `window.openai.requestModal({ template })` now supports opening a different registered UI template by passing the template URI from `registerResource`.

## Resources updates

- Date: 2025-11-04
- Products: Resources, Plugins

## Changes
- Published guidance for [preserving state in plugin UI](https://developers.openai.com/plugins/build/chatgpt-ui#manage-state).
- Added copy functionality to all code snippets.
- Launched a unified developers [changelog](https://developers.openai.com/changelog).
