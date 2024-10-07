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

#### Loading a Specific Page and Getting Form Values

You can load a specific page using the following method:
`
await viewer.loadPage(2);
`

#### Retrieve Form Values
The method `getFormValues()` will return an object containing any values in the form elements in the format: 
`
{ elementId: {"value": value}, elementId2: {"value": value2} }
`
### Simple Example Usage
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

    await viewer.loadPage(2);
    const enteredValues = await viewer.getFormValues();
</script>

<div id="outerDiv"></div>
```

### Using postRenderHook

The `postRenderHook` allows you to execute custom logic immediately after the PDF rendering process is complete. This can be particularly useful for adding additional interactivity or styling adjustments to form elements within the rendered PDF.

To use `postRenderHook`, follow these steps:

1. Define a JavaScript function containing your custom logic.
2. Set this function as the `postRenderHook` on your `PDFJsViewer` instance.
3. Call the `render` method as usual.

#### Example
```
// Define the post-render hook function
var reqPostRender = function () {
    jQuery('.pdf input:checkbox').focus(
        function(){
            jQuery(this).parent('div').addClass('focus');
        }).blur(
        function(){
            jQuery(this).parent('div').removeClass('focus');
        }
    );

    jQuery(':input').last().on('keydown', function (e) {
        if (e.keyCode == 9) {
            jQuery('input').first().focus();
            e.preventDefault();
            return false;
        }
        if (e.keyCode == 10 || e.keyCode == 13) {
            e.preventDefault();
        }
    });

    const sectionElements = jQuery('[data-annotation-id]');
    sectionElements.each(function() {
        if (jQuery(this).hasClass('buttonWidgetAnnotation') && jQuery(this).hasClass('checkBox')) {
            let currentTop = parseFloat(jQuery(this).css('top'));
            let newTop = currentTop - 1;
            jQuery(this).css('top', newTop);

            let currentLeft = parseFloat(jQuery(this).css('left'));
            let newLeft = currentLeft + 4;
            jQuery(this).css('left', newLeft);
        }
    });
};

// Initialize the PDF viewer and set the post-render hook
var target = document.getElementById('form_pdf_target');
const pdfJsViewer = new PDFJsViewer('form_pdf_target');

// Set the PDF URL and form data URL (data URL can be null)
var pdfName = 'genericPdfUrl';
var dataName = 'genericUrl';

// Set the post-render hook
pdfJsViewer.setPostRenderHook(reqPostRender);

// Apply any necessary styles to the target container
target.style.setProperty('position', 'relative');
pdfJsViewer.render(1050, 1050, pdfName, dataName, 1);
```

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
