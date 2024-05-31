class PDFJsViewer {
    constructor(targetDiv, viewerConfigOptions = {}) {
        this.targetDiv = targetDiv;
        this.worker = new __webpack_exports__WorkerMessageHandler();
        this.eventBus = new __webpack_exports__EventBus();
        this.downloadManager = new __webpack_exports__DownloadManager();
        this.linkService = new __webpack_exports__SimpleLinkService();
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

        this.PDFViewer = new __webpack_exports__PDFViewer({
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
        this.loadedDoc = null;
        this.numPages = null;
        this.currentPageNumber = null;
        this.formData = {};
        this.formRenderingOptions = {};
        this.width = null;
        this.height = null;
        this.annotations = null;
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
        const pdfDoc = await __webpack_exports__getDocument(url);
        const loadedDoc = await pdfDoc.promise;
        this.loadedDoc = loadedDoc;
        this.annotationStorage = this.loadedDoc._transport.AnnotationStorage;

        if (!this.numPages) {
            this.numPages = loadedDoc.numPages;
            this.currentPageNumber = 1;
        }
    }

    async loadPage(pageNumber) {
        try {
            await this.savePageData();
            var width = this.width;
            let height = this.height;

            if (this.PDFPageView) {
                this.PDFPageView.destroy();
                this.PDFPageView = null;
            }

            const childDiv = document.querySelector('.page');
            if (childDiv && childDiv.parentNode) {
                childDiv.parentNode.removeChild(childDiv);
            }

            this.loadedDoc.getPage(pageNumber).then(function(page) {
                this.render(width, height, this.pdfUrl, pageNumber, this.formData, this.formRenderingOptions);
                this.currentPage = pageNumber;
            }.bind(this));
            return true;
        } catch (e) {
            alert(e.message);
        }
        return false;
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

    async render(width = false, height = false, pdfUrl, pageNumber = 1, values = {}, formRenderingOptions  = {}) {
        if (width == false && height == false) {
            throw new Error("At least one dimension must be specified.");
        }

        this.width = width;
        this.height = height;

        if (!pdfUrl) {
            throw new Error("Path to PDF must be given");
        }

        if (!this.pdfUrl) {
            this.pdfUrl = pdfUrl;
        }

        if (values) {
            this.formData = values;
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
            // Add values passed to renderPage to annotation storage for eventual rendering
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
                this.options.annotationMode = __webpack_exports__AnnotationMode.DISABLE;
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
            const currentPageView = new __webpack_exports__PDFPageView({
                ...this.options,
                container: this.options.container,
                scale,
                defaultViewport: scaledViewport,
            });

            this.PDFPageView = currentPageView;
            this.PDFPageView.setPdfPage(pdfPage);

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
}

export { PDFJsViewer as default };
