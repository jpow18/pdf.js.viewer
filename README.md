# pdf.js.viewer

A small JavaScript wrapper around Mozilla's PDF.js for rendering PDF pages and working with interactive form fields inside web applications.

The project provides a focused interface for loading a document, rendering a selected page at a constrained size, reading form values, supplying initial values, navigating pages, and running application code after rendering.

## What it solves

PDF.js is flexible, but its full viewer includes more UI and setup than some applications need. This package exposes the parts needed for an embedded, form-aware PDF view while leaving the surrounding application in control.

## Main technologies

- JavaScript ES modules
- [PDF.js](https://mozilla.github.io/pdf.js/)
- Rollup

## Installation

```bash
npm install @jpow18/pdf.js.viewer
```

## Basic usage

```html
<div id="pdf-container"></div>

<script type="module">
  import PDFJsViewer from "@jpow18/pdf.js.viewer";
  import "@jpow18/pdf.js.viewer/pdf.js.viewer.css";

  const viewer = new PDFJsViewer("pdf-container");

  await viewer.render(
    800,                 // maximum width
    false,               // no height limit
    "/documents/form.pdf",
    null,                // optional URL for saved form data
    1,                   // page number
    { customer_name: "James Pow" },
    { interactiveForms: true },
  );

  const values = await viewer.getFormValues();
  console.log(values);
</script>
```

At least one of the first two arguments to `render` must provide a width or height. Set `interactiveForms` to `false` to display form annotations without editable controls.

## Common operations

```js
await viewer.loadPage(2);

const pageCount = viewer.getNumberOfPages();
const currentPage = viewer.getCurrentPageNumber();
const values = await viewer.getFormValues();

viewer.setPostRenderHook(() => {
  // Add application-specific behavior after the page is drawn.
});
```

## Development

```bash
git clone https://github.com/jpow18/pdf.js.viewer.git
cd pdf.js.viewer
npm install
npm run build
npm run lint
```

The package does not currently include an automated test suite.

## License

MIT
