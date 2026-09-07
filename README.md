# Advance Organizer (`@webwriter/advance-organizer@0.0.1`)
[License: MIT](LICENSE) | Version: 0.0.1

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
| `nodes` (`nodes`) | `Node[]` | The nodes of the advance organizer. Each node has an `id` that edges refer to and that<br>links it to the page with that `node-id`, a `position` and `dimension` in canvas<br>coordinates, a `label` and a `style`. | `[]` | ✓ |
| `edges` (`edges`) | `Edge[]` | The edges of the advance organizer. Each edge refers to its `source` and `target`<br>node by `id`, anchored at a fixed side of the node (`sourcePosition`/`targetPosition`),<br>and can carry a `label` and a `style` including arrow heads at either end. | `[]` | ✓ |
| `images` (`images`) | `Image[]` | The images placed on the canvas. Each image has a `position` and `dimension` in canvas<br>coordinates and a `src` stored as a data URL. | `[]` | ✓ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Slots
| Name | Description | Content Type |
| :--: | :---------: | :----------: |
| *(default)* | The pages of the advance organizer, as `<webwriter-advance-organizer-page>` elements. | (webwriter-advance-organizer-page)* |

*[Slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots) define how the content of the widget is rendered.*

## Editing config
| Name | Value |
| :--: | :---------: |
| `definingAsContext` | `true` |
| `content` | `(webwriter-advance-organizer-page)*` |

*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, events, custom CSS properties, or CSS parts.*


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
*Generated with @webwriter/build@1.9.1*