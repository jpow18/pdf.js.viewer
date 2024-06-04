import { getDocument, AnnotationMode } from 'pdfjs-dist/build/pdf';
import { PDFViewer, PDFPageView, EventBus, SimpleLinkService, DownloadManager } from 'pdfjs-dist/web/pdf_viewer'
import { WorkerMessageHandler } from 'pdfjs-dist/build/pdf.worker';
import jQuery from 'jquery';


class PDFJsViewer {
    constructor(targetDiv, viewerConfigOptions = {}) {
        this.targetDiv = targetDiv;
        this.worker = new WorkerMessageHandler();
        this.eventBus = new EventBus();
        this.downloadManager = new DownloadManager();
        this.linkService = new SimpleLinkService();
        this.PDFPageView = null;
        this.activePageView = null;
        this.options = {
            ...viewerConfigOptions,
            container: document.getElementById(this.targetDiv),
            eventBus: this.eventBus,
        };
        // Child element is essential for functioning of pdf.js
        let currentStyle = this.options.container.style.cssText;
        let newStyle = "position: absolute;";
        this.options.container.style = `${currentStyle} ${newStyle}`;
        let childDiv = document.createElement('div');
        childDiv.setAttribute('id', 'innerContainer');
        this.options.container.appendChild(childDiv);

        this.PDFViewer = new PDFViewer({
            ...this.options,
            linkService: this.linkService,
            enablePrintAutoRotate: true,
            enablePermissions: false,
            removePageBorders: false,
            pageColors: {},
            enableHighlightFloatingButton: true,
            mlManager: null,
        });
        this.pdfUrl = null;
        this.pdfDataUrl = null;
        this.loadedDoc = null;
        this.numPages = null;
        this.currentPageNumber = null;
        this.formData = {};
        this.formRenderingOptions = {};
        this.width = null;
        this.height = null;
        this.annotations = null;
        this.saving = false;
    }

    getCurrentPageNumber() {
        return this.currentPageNumber;
    }

    async getFormValues() {
        return this.loadedDoc._transport.annotationStorage.getAll();
    }

    getLoadedDoc() {
        return this.loadedDoc;
    }

    getNumberOfPages() {
        return this.PDFViewer.pagesCount;
    }
  
    async loadDocument(url) {
        const pdfDoc = await getDocument(url);
        const loadedDoc = await pdfDoc.promise;
        this.loadedDoc = loadedDoc;
        this.annotationStorage = this.loadedDoc._transport.AnnotationStorage;
        
        if (!this.numPages) {
            this.numPages = loadedDoc.numPages;
            this.currentPageNumber = 1;
        } 
    }

    loaderEnd() {
        jQuery('#loader').remove();
        jQuery('#APP_ICON').show();
    }

    loaderStart() {
        if (!jQuery('#loader').length) {
            var icon = jQuery('#APP_ICON');
            if (icon.length > 0) {
                icon.hide();
                icon.after('<div id="loader" style="display:block;"><font style="font-size:150%"><i class="fa fa-cog fa-spin"></i></font></div>');
            } else {
                console.error('Icon not found');
            }
        }
    }

    async loadPage(pageNumber) {
        try {
            this.savePageData();
            var width = this.width;
            let height = this.height;

            if (this.PDFPageView) {
                this.PDFPageView.destroy();
                this.PDFPageView = null;
            }

            // If loadPage is called as part of navigating to a new page, 
            // Must remove the previous pages div for proper rendering
            const childDiv = document.querySelector('.page');
            if (childDiv && childDiv.parentNode) {
                childDiv.parentNode.removeChild(childDiv);
            }

            this.loaderStart();

            this.loadedDoc.getPage(pageNumber).then(function() {
                this.render(width, height, this.pdfUrl, false, pageNumber, this.formData, this.formRenderingOptions);
                this.loaderEnd();
                this.currentPage = pageNumber;
            }.bind(this));
        } catch (e) {
            alert(e.message);
        }
    }

    loadPdfData(pdfDataUrl) {
        this.pdfDataUrl = pdfDataUrl;
        if (typeof pdfDataUrl!="undefined" && pdfDataUrl!==false) {
            try {
                this.loaderStart();
                jQuery.ajax({
                    dataType: "json",
                    url: pdfDataUrl,
                    async: false,
                    method: "GET",
                    success: (results) => {
                        try {
                            if (results.success) {
                                if (typeof results.data !== 'undefined') {
                                    this.formData = results.data;
                                }
                            }
                        } catch (e) {
                            console.error('Error in success callback:', e);
                        }
                    },
                    fail: () => {
                        this.loaderEnd();
                    },
                    complete: () => {
                        // this.loaderEnd();
                    }
                });
            } catch (e) {
                this.loaderEnd();
                console.error('Error in AJAX call:', e);
            }
        }
    }

    mergeFormData(newFormData) {
        for (const key in newFormData) {
            if (this.formData.hasOwnProperty(key)) {
                this.formData[key] = newFormData[key];
            }
        }
    }

    navigateToNextPage() {
        let currentPageNumber = this.getCurrentPageNumber();
        const pagesCount = this.numPages;
        if (currentPageNumber >= pagesCount) {
            return currentPageNumber;
        }

        this.currentPageNumber++;
        return this.getCurrentPageNumber();
    }

    navigateToPreviousPage() {
        let currentPageNumber = this.getCurrentPageNumber();
        if (currentPageNumber <= 1) {
            return currentPageNumber;
        }

        this.currentPageNumber--;
        return this.getCurrentPageNumber();
    }

    async render(width = false, height = false, pdfUrl, pdfDataUrl, pageNumber = 1, values = {}, formRenderingOptions  = {}) {
        if (width == false && height == false) {
            throw new Error("At least one dimension must be specified.");
        }

        this.width = width;
        this.height = height;

        if (!pdfUrl) {
            throw new Error("Path to PDF must be given");
        }

        let target = document.getElementById(this.targetDiv);
        target.innerHTML ='<div id="loader" style=\"margin:5px\"><i class=\"fa fa-cog fa-spin\"></i></div>';

        if (!this.pdfUrl) {
            this.pdfUrl = pdfUrl;
        }

        if (pdfDataUrl) {
            this.loadPdfData(pdfDataUrl);
        }

        if (values) {
            this.mergeFormData(values);
        }

        if (Object.keys(formRenderingOptions).length !== 0)
        {
            this.formRenderingOptions = formRenderingOptions;
        }

        try {
            await this.loadDocument(pdfUrl);
            const pdfPage = await this.loadedDoc.getPage(pageNumber);
            const annotations = await pdfPage.getAnnotations();
            this.annotations = annotations;
            // Add values passed to render to annotation storage for eventual rendering
            Object.entries(this.formData).forEach(([key, value]) => {
                let foundKey = null;
                annotations.forEach((annotation) => {
                    if (Object.values(annotation).includes(key)) {
                        foundKey = annotation.id;
                    }
                });
                if (foundKey!== null) {
                    this.loadedDoc.annotationStorage.setValue(foundKey, {value: value});
                }
            });

            const viewport = pdfPage.getViewport({ scale: 1 });
            let viewportWidth = width !== false ? width : Infinity;
            let viewportHeight = height !== false ? height : Infinity;
            const scaleX = viewportWidth / viewport.width;
            const scaleY = viewportHeight / viewport.height;
            const scale = Math.min(scaleX, scaleY);
            const scaledViewport = pdfPage.getViewport({ scale });

            const interactiveForms = formRenderingOptions.interactiveForms;

            if (interactiveForms === false) {
                this.options.annotationMode = AnnotationMode.DISABLE;
            }

            this.options.layerProperties = {
                annotationEditorUIManager: null,
                annotationStorage: this.loadedDoc.annotationStorage,
                downloadManager: null,
                enableScripting: false,
                fieldObjectsPromise: null,
                findController: null,
                hasJSActionsPromise: null,
                linkService: this.linkService
            };
            const currentPageView = new PDFPageView({
                ...this.options,
                container: this.options.container,
                scale,
                defaultViewport: scaledViewport,
            });

            this.PDFPageView = currentPageView;
            this.PDFPageView.setPdfPage(pdfPage);

            this.loaderEnd();
            this.PDFPageView.draw();
        } catch (error) {
            console.error('Error loading document:', error);
        }
    }

    async savePageData() {
        try {
            const tempData = await this.getFormValues();
            for (const prop in tempData) {
                let foundKey = null;
                this.annotations.forEach((annotation) => {
                    if (Object.values(annotation).includes(prop)) {
                        foundKey = annotation.fieldName;
                    }
                });
                this.formData[foundKey] = tempData[prop]["value"];
            }
        } catch (e) {
            alert(e.message);
        }
    }

    async savePdfData(saveUrl, token = false) {
        try {
            await this.savePageData();
            if (this.saving) {
                alert('Already processing request.');
                return false;
            }
            this.saving = true;
            let success = false;
            let postData = {};
            for (let datarow in this.formData) {
                let newName = encodeURIComponent(datarow);
                postData[newName]=this.formData[datarow];
            }
            if (token) {
                postData.csrf = token;
            }
            this.loaderStart();
            jQuery.ajax({
                dataType: "json",
                url: saveUrl,
                async: false,
                data: postData,
                method: "POST",
                context: this,
                success: function(results) {
                    try {
                        if (results.success) {
                            success = results;
                        }
                        else {
                            if (typeof results.message != 'undefined') {
                                console.error(results.message);
                            }
                        }
                    }
                    catch (e) {}
                },
                fail: function() {
                    this.loaderEnd();
                },
                complete: function() {
                    this.saving = false;
                    // Schedule the next request when the current one's complete
                    this.loaderEnd();
                }
            });
            return success;
        }
        catch (e) {
            this.saving = false;
            alert(e.message);
        }
        return false;
    }
}

export default PDFJsViewer;