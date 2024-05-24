# pdf.js.viewer

A simple PDF viewer built on top of the `pdf.js` library, designed to handle PDF documents efficiently within web applications. Specifically, this simplifies the rendering of interactive forms in PDFs without the overhead of the pdf.js viewer.

## Installation

Initialize your project:
`npm init`

Install pdf.js.viewer:
`npm install @jpow18/pdf.js.viewer`

## Usage
#### Target a div
To utilize **pdf.js.viewer**, you must designate a target `<div>` by supplying the ID of an existing `<div>` to the class constructor:
`const viewer = new PDFJsViewer('div1');`

#### Render
To render a PDF document, invoke the `render` method. You have the flexibility to specify either the width or height; however, at least one dimension must be provided. If only one dimension is specified, the unspecified dimension defaults to unlimited. Additionally, ensure you provide a valid path to the PDF document, such as `'./pdfs/f1040.pdf'`.

An optional parameter allows you to specify the page number to render (default is 1), and you can override form element values during rendering by passing an object with alternative values:
```
	const  formInsertvalues = {
		'538R': 'John J',
		'539R':  'Smith',
		'545R':  true  // A checkbox element
	}
	viewer.render(800, false, './pdfs/f1040.pdf', 1, formInsertValues);
```
#### Render Non-interactive Forms
To render forms non-interactively (i.e., to simply display them without interactivity), use the following syntax:
```
viewer.render(800,800,page,target,values, {interactiveForms: false});
```
#### Retrieve Form Values
The method `getFormValues()` will return an object containing any values in the form elements in the format: 
`
{ elementId: {"value": value}, elementId2: {"value": value2} }
`
### Example Usage
```
<script  type="module">
	let  pdfContainer = 'outerDiv';
	const  viewer = new  PDFJsViewer(pdfContainer);

	const  formInsertvalues = {
		'538R': 'John J',
		'539R':  'Smith',
		'545R':  true  // A checkbox element
	}
	const  formConfigOptions = {
		'interactiveForms':  false
	}
	viewer.render(800, 800, './pdfs/f1040.pdf', 1, insertFormvalues, formConfigOptions)
</script>

<div id="outerDiv"></div>
```

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
