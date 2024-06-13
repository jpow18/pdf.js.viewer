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
        this.previousPageNumber = 1;
        this.elementsOnPage = {};
        this.formData = {};
        this.formRenderingOptions = {};
        this.width = null;
        this.height = null;
        this.annotations = null;
        this.saving = false;
        this._postRenderHook = null;
        this.dirty = false;
        this.numberedPageNavigation = true;
        this.idClosureOverrides = {};
        this.idValueGetOverrides = {};
    }

    assertValidControlClosure(closure) {
        if (typeof closure != 'function') {
            throw "Passed item is not a function";
        }
        if (closure.length != 2) {
            throw 'Passed function must accept two arguments: itemProperties and viewport';
        }
    }

    assertValidIdValueClosure(closure) {
        if (typeof closure != 'function') {
            throw "Passed item is not a function";
        }
        if (closure.length != 1) {
            throw 'Passed function must accept one arguments: element';
        }
    }

    getAllPagesElements() {
        return this.elementsOnPage;
    }

    getCurrentPageNumber() {
        return this.currentPageNumber;
    }

    getDirty() {
        return this.dirty;
    }

    getElementPropertiesWithValues(obj) {
        let properties = {};
        Object.getOwnPropertyNames(obj).forEach((prop) => {
            try {
                properties[prop] = obj[prop];
            } catch (e) {
                properties[prop] = "Inaccessible";
            }
        });
        Object.keys(obj).forEach((prop) => {
            if (!(prop in properties)) {
                try {
                    properties[prop] = obj[prop];
                } catch (e) {
                    properties[prop] = "Inaccessible";
                }
            }
        });
        let proto = Object.getPrototypeOf(obj);
        while (proto) {
            Object.getOwnPropertyNames(proto).forEach((prop) => {
                if (!(prop in properties)) {
                    try {
                        properties[prop] = obj[prop];
                    } catch (e) {
                        properties[prop] = "Inaccessible";
                    }
                }
            });
            proto = Object.getPrototypeOf(proto);
        }
        return properties;
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

    getPageElements(pageNumber) {
        if (typeof this.elementsOnPage[pageNumber] != 'undefined' ) {
            return this.elementsOnPage[pageNumber];
        }
        return [];
    }

    getPageForElement(elementId){
        for (let i = 1; i <= this.numPages; i++) {
            const pageElements = this.elementsOnPage[String(i)];
            if (pageElements) {
                if (pageElements.includes(elementId)) {
                    return i;
                }
            }
        }
        return false;
    };

    getPdfData() {
        this.savePageData();
        return this.formData;
    }

    getPreviousPageNumber() {
        return this.previousPageNumber;
    }

    hasErrors(){
        if (jQuery('[data-invalid]').length>0) {
            alert('Please correct the invalid data entered first');
            return true;
        }
        return false;
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
        if (Object.keys(this.elementsOnPage).length === 0) {
            for (let i = 1; i <= this.numPages; i++) {
                const page = await this.loadedDoc.getPage(i);
                const elements = await this.returnFormElementsOnPage(page);
                this.elementsOnPage[i] = elements;
            }
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
        if (this.hasErrors()) {
            return false;
        }
        try {
            if (pageNumber == this.previousPageNumber)
            {
                return;
            }
            this.savePageData();
            var width = this.width;
            let height = this.height;
            if (this.PDFPageView) {
                this.PDFPageView.destroy();
                this.PDFPageView = null;
            }
            this.loaderStart();
            this.loadedDoc.getPage(pageNumber).then(function() {
                this.render(width, height, this.pdfUrl, false, pageNumber, this.formData, this.formRenderingOptions);
                this.loaderEnd();
                if (this.numberedPageNavigation) {
                    this.previousPageNumber = pageNumber;
                }
                else {
                    this.previousPageNumber = this.currentPageNumber;
                }
                this.numberedPageNavigation = true;
                this.currentPageNumber = pageNumber;
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

    async maskYesNo(id) {
        let c = function(itemProperties, viewport) {
            return this.yesNoDropDown(itemProperties, viewport);
        };
        this.setControlRenderClosureById(c.bind(this), id);
    }

    mergeFormData(newFormData) {
        for (const key in newFormData) {
            this.formData[key] = newFormData[key];
        }
    }

    navigateToNextPage() {
        try {
            if (this.currentPageNumber==this.numPages)
                return this.currentPageNumber;
            return this.currentPageNumber+1;
        }
        catch(e) {
            alert(e.message);
        }
        return false;
    }

    navigateToPreviousPage() {
        try {
            if (this.currentPageNumber==1)
                return 1;
            return this.currentPageNumber-1;
        }
        catch(e) {
            alert(e.message);
        }
        return false;
    }

    async render(width = false, height = false, pdfUrl, pdfDataUrl = null, pageNumber = 1, values = {}, formRenderingOptions  = {}) {
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
            this.PDFPageView.draw().then(() => {
                if (this._postRenderHook) {
                    this._postRenderHook();
                }
                // Check for custom closures
                Object.entries(this.idClosureOverrides).forEach(([id, closure]) => {
                    const item = jQuery(`[id='${id}']`);
                    const elementPropertiesWithValues = this.getElementPropertiesWithValues(item[0]);
                    if (closure) {
                        const control = closure(elementPropertiesWithValues, viewport);
                        if (control) {
                            const parent = item.parent();
                            jQuery(`[id='${id}']`).remove();
                            parent[0].appendChild(control);
                        }
                    }
                });
                // Remove inline styles that PDF.js base library adds to annotationLayer elements so that customization of CSS is easier
                const inputElements = jQuery('[data-element-id]');
                inputElements.each(function() {
                    jQuery(this).css({
                        'background-color': '',
                        'color': ''
                    });
                    if (jQuery(this).css('background-color') === 'rgba(0, 0, 0, 0)' || jQuery(this).css('background-color') === 'transparent') {
                        // Remove the background color
                        jQuery(this).css('background-color', '');
                    }
                });
            });
        } catch (error) {
            console.error('Error loading document:', error);
        }
    }

    async returnFormElementsOnPage(page) {
        const elements = [];
        const items = await page.getAnnotations();
        items.forEach(item => {
            elements.push(item.fieldName);
        });
        return elements;
    }

    savePageData() {
        const self = this;
        const inputElements = jQuery('[data-element-id]');
        const tempData = {};
        inputElements.each(function() {
            let id = jQuery(this).attr('id');
            let value = jQuery(this).val();
            tempData[id] = value;
        });
        const tempData2 = {};
        inputElements.each(function() {
            let id = jQuery(this).attr('id');
            let originalId = jQuery(this).attr('data-element-id');
            tempData2[id] = self.loadedDoc._transport.annotationStorage.getValue(originalId, "");
        });
        for (const key in tempData2) {
            // For some reason, the checkbox elements selected by jQuery all have the value "on"
            // Hence the use of getValue above and merging below
            if (tempData.hasOwnProperty(key) && tempData[key] == "on") {
                this.formData[key] = tempData2[key].value;
            }
            else {
                this.formData[key] = tempData[key];
            }
        }
    }

    async savePdfData(saveUrl, token = false) {
        if (this.hasErrors()) {
            return false;
        }
        try {
            this.savePageData();
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
            success = await new Promise((resolve, reject) => {
                jQuery.ajax({
                    dataType: "json",
                    url: saveUrl,
                    data: postData,
                    method: "POST",
                    context: this,
                    success: function(results) {
                        try {
                            if (results.success) {
                                resolve(results);
                            } else {
                                if (typeof results.message !== 'undefined') {
                                    console.error(results.message);
                                }
                                resolve(false);
                            }
                        } catch (e) {
                            console.error(e);
                            resolve(false);
                        }
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        console.error('AJAX error: ', textStatus, errorThrown);
                        resolve(false);
                    },
                    complete: function() {
                        this.saving = false;
                        this.loaderEnd();
                    }
                });
            });
            return success;
        }
        catch (e) {
            this.saving = false;
            alert(e.message);
        }
        return false;
    }

    setControlRenderClosureById(closure, id) {
        if (!closure) {
            try {
                delete this.idClosureOverrides[id];
            } catch (e) {
            }
        } else {
            this.assertValidControlClosure(closure);
            this.idClosureOverrides[id] = closure;
        }
    }

    setDirty() {
        this.dirty = true;
    }

    setIdValueOverride(closure, id) {
        if (!closure) {
            try {
                delete this.idValueGetOverrides[id];
            } catch (e) {}
        } else {
            this.assertValidIdValueClosure(closure);
            this.idValueGetOverrides[id] = closure;
        }
    }

    setPostRenderHook(hook) {
        this._postRenderHook = hook;
    }

    yesNoDropDown (itemProperties, viewport) {
        var control = document.createElement('select');
        if (itemProperties.multiSelect)
            control.multiple = true;
        control.style.width = Math.floor(itemProperties.clientWidth - 3) + 'px';
        control.style.height = Math.floor(itemProperties.clientHeight) + 'px';
        control.style.textAlign = itemProperties.textAlignment;
        control.id = itemProperties.id;
        control.name = itemProperties.id;
        control.dataset.elementId = itemProperties.dataset.elementId;
        if (Math.floor(itemProperties.fontSizeControl) >= Math.floor(itemProperties.clientHeight - 2)) {
            control.style.fontSize = Math.floor(itemProperties.clientHeight - 3) + 'px';
        } else {
            control.style.fontSize = itemProperties.fontSizeControl + 'px';
        }
        if (itemProperties.style.border == '1px dashed red') {
            control.style.border = '1px dashed red';
        }
        else {
            control.style.border = '1px solid #E6E6E6';
        }
        control.style.display = 'block';

        var optionElement = document.createElement('option');
        optionElement.value = '';
        optionElement.innerHTML = '';
        if(itemProperties.value=='') {
            optionElement.selected=true;
        }
        control.appendChild(optionElement);

        optionElement = document.createElement('option');
        optionElement.value = '1';
        optionElement.innerHTML = 'Yes';
        if(itemProperties.value=='1') {
            optionElement.selected=true;
        }
        control.appendChild(optionElement);

        optionElement = document.createElement('option');
        optionElement.value = '0';
        optionElement.innerHTML = 'No';
        if(itemProperties.value=='0') {
            optionElement.selected=true;
        }
        control.appendChild(optionElement);

        if (itemProperties.readOnly) {
            control.disabled = 'disabled';
            control.style.cursor = "not-allowed";
        }
        return control;
    }
}

export default PDFJsViewer;