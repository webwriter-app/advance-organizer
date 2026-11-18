# Advance Organizer (`@webwriter/advance-organizer@2.0.0`)
[License: MIT](LICENSE) | Version: 2.0.0

Create visual advance organizers to introduce new topics. Link concepts to further content that learners can open with a click.





## `WebwriterAdvanceOrganizer` (`<webwriter-advance-organizer>`)
A visual advance organizer: a canvas of labeled boxes, connecting arrows and images
that gives learners an overview of a topic before they study it in detail.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/advance-organizer/widgets/webwriter-advance-organizer.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/advance-organizer/widgets/webwriter-advance-organizer.js"></script>
<webwriter-advance-organizer></webwriter-advance-organizer>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/advance-organizer
```

```html
<link href="@webwriter/advance-organizer/widgets/webwriter-advance-organizer.css" rel="stylesheet">
<script type="module" src="@webwriter/advance-organizer/widgets/webwriter-advance-organizer.js"></script>
<webwriter-advance-organizer></webwriter-advance-organizer>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterAdvanceOrganizer.dataType` | `string` | - | `"application/json"` | ✗ |
| `WebwriterAdvanceOrganizer.convertFrom` | `object` | - | `{ ul: "loadList", ol: "loadList", ".json": "importJson", }` | ✗ |
| `WebwriterAdvanceOrganizer.convertTo` | `object` | - | `{ ul: "toList", ".json": "exportJson", "image/svg+xml": "exportSvg", }` | ✗ |
| `WebwriterAdvanceOrganizer.actions` | `object` | - | `{ addNode: { label: (widget: { msg: MsgFn }) => widget.msg("Add concept"), group: "organizer", icon: "Add", intent: "default" as const, }, addImage: { label: (widget: { msg: MsgFn }) => widget.msg("Add image"), group: "organizer", icon: "Image", intent: "default" as const, }, }` | ✗ |
| `WebwriterAdvanceOrganizer.optionGroups` | `object` | - | `{ organizer: { label: (widget: { msg: MsgFn }) => widget.msg("Organizer"), collapsible: true, advanced: false, }, }` | ✗ |
| `msg` | - | - | - | ✗ |
| `nodes` | `Node[]` | The nodes of the advance organizer. Each node has an `id` that edges refer to and that<br>links it to the page with that `node-id`, a `position` and `dimension` in canvas<br>coordinates, a `label` and a `style`. | `[]` | ✗ |
| `edges` | `Edge[]` | The edges of the advance organizer. Each edge refers to its `source` and `target`<br>node by `id`, anchored at a fixed side of the node (`sourcePosition`/`targetPosition`),<br>and can carry a `label` and a `style` including arrow heads at either end. | `[]` | ✗ |
| `images` | `Image[]` | The images placed on the canvas. Each image has a `position` and `dimension` in canvas<br>coordinates and a `src` stored as a data URL. | `[]` | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `addNode` | - | -
| `addImage` | - | -

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Slots
| Name | Description | Content Type |
| :--: | :---------: | :----------: |
| *(default)* | The pages of the advance organizer, as `<webwriter-advance-organizer-page>` elements. | (webwriter-advance-organizer-page)* |

*[Slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots) define how the content of the widget is rendered.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| canvas | The canvas with the nodes, edges and images. |
| page | A page of the advance organizer: the section that holds the page content (printed and shown when opened). Keyboard: with the canvas focused in edit mode, Enter selects the first item (and then edits the label of the selected node or edge), Tab and Shift+Tab step through the items, arrow keys move the selection, C adds a concept, R connects two selected concepts (or starts drawing a relation), I adds an image. Readers reach every node that has a page with Tab and open it with Enter or Space. Conversions: a nested `ul` or `ol` becomes a tree of concepts with arrows from each item to its sub-items (the item text only; lists in an item are its sub-items). The concepts become a nested `ul` again: roots are the concepts without an incoming arrow and sub-items follow the arrows from top to bottom. Edge labels, styles, images and linked pages are not part of the list. Files: `.json` imports and exports the organizer data (nodes, edges, images; linked pages are not included), `image/svg+xml` exports a picture of the canvas (labels as plain text). Signal `openConcept` (string): the label of the concept whose page is open, empty when none is. Theme: text uses `--ww-text-color` and `--ww-font-family`; selection and focus use `--ww-theme-accent-1` (or `--ao-selection-color`). Node and edge colors are authored data and do not follow the theme. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |
| `definingAsContext` | `true` |
| `content` | `(webwriter-advance-organizer-page)*` |
| `importFormats` | `.json` |
| `exportFormats` | `.json,image/svg+xml` |

*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public events, or custom CSS properties.*


## `WebwriterAdvanceOrganizerPage` (`<webwriter-advance-organizer-page>`)
A page of a `<webwriter-advance-organizer>`: the content shown when a learner clicks on
the node it belongs to. Pages are children of the advance organizer and are linked to a
node by their `node-id`.

A page holds arbitrary content – text, images, other widgets – and stays hidden until
its node is opened. Pages are managed by the advance organizer, adding a page to a node
in the toolbar creates one, and removing the node removes its page again.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/advance-organizer/widgets/webwriter-advance-organizer-page.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/advance-organizer/widgets/webwriter-advance-organizer-page.js"></script>
<webwriter-advance-organizer-page></webwriter-advance-organizer-page>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/advance-organizer
```

```html
<link href="@webwriter/advance-organizer/widgets/webwriter-advance-organizer-page.css" rel="stylesheet">
<script type="module" src="@webwriter/advance-organizer/widgets/webwriter-advance-organizer-page.js"></script>
<webwriter-advance-organizer-page></webwriter-advance-organizer-page>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `nodeId` (`node-id`) | `string \| null` | - | `null` | ✓ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Slots
| Name | Description | Content Type |
| :--: | :---------: | :----------: |
| *(default)* | The page content. | (flow)* |

*[Slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots) define how the content of the widget is rendered.*

## Editing config
| Name | Value |
| :--: | :---------: |
| `definingForContent` | `true` |
| `content` | `(flow)*` |
| `uninsertable` | `true` |

*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, events, custom CSS properties, or CSS parts.*


---
*Generated with @webwriter/build@1.14.0*