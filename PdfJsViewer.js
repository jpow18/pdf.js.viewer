// noinspection JSUnusedGlobalSymbols

import { AnnotationMode, getDocument } from "pdfjs-dist/build/pdf";
import {
  DownloadManager,
  EventBus,
  PDFPageView,
  PDFViewer,
  SimpleLinkService,
} from "pdfjs-dist/web/pdf_viewer";
import { WorkerMessageHandler } from "pdfjs-dist/build/pdf.worker";

class PDFJsViewer {
  /**
   * @param {string} targetDiv DOM ID of the container of the web PDF viewer
   * @param {Object} [viewerConfigOptions] Default options passed to the PDF
   *   viewer
   * @param {Object} [documentOptions] Additional options (besides PDF URL) to
   *   pass to pdfjsLib.getDocument()
   */
  constructor(targetDiv, viewerConfigOptions = {}, documentOptions = {}) {
    this.targetDiv = targetDiv;
    this.worker = new WorkerMessageHandler();
    this.eventBus = new EventBus();
    this.downloadManager = new DownloadManager();
    this.linkService = new SimpleLinkService();
    this.PDFPageView = null;
    this.activePageView = null;
    this.documentOptions = documentOptions;
    this.options = {
      ...viewerConfigOptions,
      container: document.getElementById(this.targetDiv),
      eventBus: this.eventBus,
    };
    this.options.container.style.position = "absolute";
    this.innerContainer = document.createElement("div");
    this.innerContainer.id = "innerContainer";
    this.options.container.appendChild(this.innerContainer);
    // noinspection JSCheckFunctionSignatures
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
    if (typeof closure != "function") {
      throw "Passed item is not a function";
    }
    if (closure.length !== 2) {
      throw "Passed function must accept two arguments: itemProperties and viewport";
    }
  }

  assertValidIdValueClosure(closure) {
    if (typeof closure != "function") {
      throw "Passed item is not a function";
    }
    if (closure.length !== 1) {
      throw "Passed function must accept one arguments: element";
    }
  }

  async associateFile(saveUrl, formData) {
    try {
      const results = await this.ajax(saveUrl, "POST", formData);

      if (results.success) {
        return results;
      }

      if ("undefined" !== typeof results.message) {
        alert(results.message);
      }
    } catch (e) {
      console.error("Error in associateFile:", e);
      alert(e.message);
    }

    return false;
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
      } catch (_e) {
        properties[prop] = "Inaccessible";
      }
    });
    Object.keys(obj).forEach((prop) => {
      if (!(prop in properties)) {
        try {
          properties[prop] = obj[prop];
        } catch (_e) {
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
          } catch (_e) {
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
    return this.elementsOnPage[pageNumber] || [];
  }

  getPageForElement(elementId) {
    for (let i = 1; i <= this.numPages; i++) {
      if (this.elementsOnPage[i]?.includes(elementId)) {
        return i;
      }
    }
    return false;
  }

  getPdfData() {
    this.savePageData();
    return this.formData;
  }

  getPreviousPageNumber() {
    return this.previousPageNumber;
  }

  hasErrors() {
    if (document.querySelectorAll("[data-invalid]").length > 0) {
      alert("Please correct the invalid data entered first");
      return true;
    }
    return false;
  }

  async loadDocument(url) {
    const options = { ...this.documentOptions };
    options.url = url;

    const pdfDoc = await getDocument(options);
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
        this.elementsOnPage[i] = await this.returnFormElementsOnPage(page);
      }
    }
  }

  loaderEnd() {
    const icon = document.querySelector("#APP_ICON");
    const loader = document.querySelector("#loader");

    if (loader) {
      const loaderParent = loader.parentNode;

      if (loaderParent) {
        loaderParent.removeChild(loader);
      }
    }

    if (icon) {
      icon.style.display = "";
    }
  }

  loaderStart() {
    const loader = document.getElementById("loader");

    if (loader) {
      return;
    }

    const icon = document.getElementById("APP_ICON");

    if (!icon) {
      return;
    }

    icon.style.display = "none";

    const div = document.createElement("div");
    div.id = "loader";
    div.style.display = "block";

    const span = document.createElement("span");
    span.style.fontSize = "150%";

    const i = document.createElement("i");
    i.className = "fa fa-cog fa-spin";

    span.appendChild(i);
    div.appendChild(span);

    if (icon.nextSibling) {
      icon.parentNode.insertBefore(div, icon.nextSibling);
    } else {
      icon.parentNode.appendChild(div);
    }
  }

  async loadPage(pageNumber) {
    if (this.hasErrors()) {
      return false;
    }
    try {
      this.savePageData();
      const width = this.width;
      let height = this.height;
      this.loadedDoc.getPage(pageNumber).then(
        function () {
          this.render(
            width,
            height,
            this.pdfUrl,
            false,
            pageNumber,
            this.formData,
            this.formRenderingOptions,
          );
          if (this.numberedPageNavigation) {
            this.previousPageNumber = pageNumber;
          } else {
            this.previousPageNumber = this.currentPageNumber;
          }
          this.numberedPageNavigation = true;
          this.currentPageNumber = pageNumber;
        }.bind(this),
      );
    } catch (e) {
      alert(e.message);
    }
  }

  loadPdfData(pdfDataUrl) {
    this.pdfDataUrl = pdfDataUrl;
    if (typeof pdfDataUrl != "undefined" && pdfDataUrl !== false) {
      this.ajax(pdfDataUrl).then((results) => {
        if (!results.success) {
          return;
        }

        if ("undefined" !== typeof results.data) {
          this.formData = results.data;
        }
      });
    }
  }

  async maskYesNo(id) {
    /**
     * @this {PDFJsViewer}
     * @returns {HTMLSelectElement}
     */
    let c = function (itemProperties, viewport) {
      return this.yesNoDropDown(itemProperties, viewport);
    };
    this.setControlRenderClosureById(c.bind(this), id);
  }

  mergeFormData(newFormData) {
    Object.assign(this.formData, newFormData);
  }

  navigateToNextPage() {
    return this.currentPageNumber < this.numPages
      ? this.currentPageNumber + 1
      : this.currentPageNumber;
  }

  navigateToPreviousPage() {
    return this.currentPageNumber > 1 ? this.currentPageNumber - 1 : 1;
  }

  async render(
    width = false,
    height = false,
    pdfUrl,
    pdfDataUrl = null,
    pageNumber = 1,
    values = {},
    formRenderingOptions = {},
  ) {
    if (width === false && height === false) {
      throw new Error("At least one dimension must be specified.");
    }
    this.width = width;
    this.height = height;
    if (!pdfUrl) {
      throw new Error("Path to PDF must be given");
    }
    let target = document.getElementById(this.targetDiv);
    target.innerHTML =
      '<div id="loader" style="margin:5px"><i class="fa fa-cog fa-spin"></i></div>';
    if (!this.pdfUrl) {
      this.pdfUrl = pdfUrl;
    }
    if (pdfDataUrl) {
      this.loadPdfData(pdfDataUrl);
    }
    if (values) {
      this.mergeFormData(values);
    }
    if (Object.keys(formRenderingOptions).length !== 0) {
      this.formRenderingOptions = formRenderingOptions;
    }
    try {
      if (!this.loadedDoc) {
        await this.loadDocument(pdfUrl);
      }
      const pdfPage = await this.loadedDoc.getPage(pageNumber);
      const annotations = await pdfPage.getAnnotations();
      this.annotations = annotations;
      Object.entries(this.formData).forEach(([key, value]) => {
        let foundKey = null;
        let isCheckbox = false;

        annotations.forEach((annotation) => {
          if (Object.values(annotation).includes(key)) {
            foundKey = annotation.id;
            isCheckbox = annotation.fieldType === "Btn";
          }
        });

        if (foundKey !== null) {
          // If it's a checkbox and value is an empty string, set it to "Off"
          const cleanedValue = isCheckbox && value === "" ? "Off" : value;

          this.loadedDoc.annotationStorage.setValue(foundKey, {
            value: cleanedValue,
          });
        }
      });
      const viewport = pdfPage.getViewport({ scale: 1 });
      let viewportWidth = width !== false ? width : Infinity;
      let viewportHeight = height !== false ? height : Infinity;
      const scaleX = viewportWidth / viewport.width;
      const scaleY = viewportHeight / viewport.height;
      const scale = Math.min(scaleX, scaleY);
      const scaledViewport = pdfPage.getViewport({ scale });

      const interactiveForms =
        "interactiveForms" in formRenderingOptions
          ? formRenderingOptions.interactiveForms
          : false;
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
        linkService: this.linkService,
      };
      // noinspection JSCheckFunctionSignatures
      this.PDFPageView = new PDFPageView({
        ...this.options,
        container: this.options.container,
        scale,
        defaultViewport: scaledViewport,
      });
      this.PDFPageView.setPdfPage(pdfPage);
      this.loaderEnd();
      this.PDFPageView.draw().then(() => {
        if (this._postRenderHook) {
          this._postRenderHook();
        }
        Object.entries(this.idClosureOverrides).forEach(([id, closure]) => {
          const items = Array.from(
            document.querySelectorAll(`#${CSS.escape(id)}`),
          );

          let elementPropertiesWithValues = {};

          if (items.length > 0) {
            elementPropertiesWithValues = this.getElementPropertiesWithValues(
              items[0],
            );
          }

          if (closure) {
            const control = closure(elementPropertiesWithValues, viewport);

            if (control) {
              items.forEach((item) => {
                const parentNode = item.parentNode;
                if (!parentNode) {
                  return;
                }

                parentNode.removeChild(item);

                if (items.length > 1) {
                  parentNode.appendChild(control.cloneNode(true));
                } else {
                  parentNode.appendChild(control);
                }
              });
            }
          }
        });

        // Remove inline styles that PDF.js base library adds to annotationLayer elements so that customization of CSS is easier
        Array.from(document.querySelectorAll("[data-element-id]")).forEach(
          (el) => {
            el.style.color = "";

            const backgroundColor = getComputedStyle(el).backgroundColor;

            if (
              backgroundColor === "rgba(0, 0, 0, 0)" || // transparent
              backgroundColor === "transparent" || // transparent (keyword)
              backgroundColor === "rgb(255, 255, 255)" // white
            ) {
              el.style.backgroundColor = "";
            }
          },
        );

        // The "presentation" canvas, on some screens, overflows the canvasWrapper element; this
        // leads the form elements to be misplaced. This code restricts the presentation element size
        Array.from(
          document.querySelectorAll('canvas[role="presentation"]'),
        ).forEach((canvas) => {
          canvas.style.width = "100%";
          canvas.style.height = "100%";
          canvas.style.maxWidth = "100%";
          canvas.style.maxHeight = "100%";
        });
      });
    } catch (error) {
      console.error("Error loading document:", error);
    }
  }

  async returnFormElementsOnPage(page) {
    const items = await page.getAnnotations();
    return items.map((item) => item.fieldName);
  }

  savePageData() {
    const self = this;
    const inputElements = Array.from(
      document.querySelectorAll("[data-element-id]"),
    );
    const tempData = {};

    inputElements.forEach((el) => {
      const id = el.id;
      tempData[id] = el.value;
    });

    const tempData2 = {};
    inputElements.forEach((el) => {
      const id = el.id;
      const originalId = el.getAttribute("data-element-id");
      tempData2[id] = self.loadedDoc._transport.annotationStorage.getValue(
        originalId,
        "",
      );
    });

    for (const key in tempData2) {
      // For some reason, the checkbox elements selected by jQuery all have the value "on"
      // Hence the use of getValue above and merging below
      // eslint-disable-next-line no-prototype-builtins
      if (tempData.hasOwnProperty(key) && tempData[key] === "on") {
        this.formData[key] = tempData2[key].value;
      } else {
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
        alert("Already processing request.");
        return false;
      }
      this.saving = true;
      let postData = {};
      for (let datarow in this.formData) {
        let newName = encodeURIComponent(datarow);
        postData[newName] = this.formData[datarow];
      }
      if (token) {
        postData.csrf = token;
      }

      let results;

      try {
        results = await this.ajax(saveUrl, "POST", postData);
      } catch (_err) {
        return false;
      } finally {
        this.saving = false;
      }

      if (results.success) {
        return results;
      }

      if ("undefined" !== typeof results.message) {
        console.error(results.message);
      }
    } catch (e) {
      this.saving = false;
      alert(e.message);
    }
    return false;
  }

  async setComment(saveUrl, submissionId, comment, csrfToken) {
    try {
      const postdata = {
        id: submissionId,
        comment: comment,
        csrf: csrfToken,
      };

      const results = await this.ajax(saveUrl, "POST", postdata);

      if (results.success) {
        return results;
      }

      if (results.message) {
        alert(results.message);
      }
    } catch (e) {
      console.error("Error in setComment:", e);
      alert(e.message);
    }

    return false;
  }

  setControlRenderClosureById(closure, id) {
    if (!closure) {
      delete this.idClosureOverrides[id];
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
      delete this.idValueGetOverrides[id];
    } else {
      this.assertValidIdValueClosure(closure);
      this.idValueGetOverrides[id] = closure;
    }
  }

  setPostRenderHook(hook) {
    this._postRenderHook = hook;
  }

  async stashPdfData(saveUrl, token = false) {
    try {
      this.savePageData();
      let postData = {};
      for (let datarow in this.formData) {
        let newName = encodeURIComponent(datarow);
        postData[newName] = this.formData[datarow];
      }
      if (token) {
        postData.csrf = token;
      }

      let results;

      try {
        results = await this.ajax(saveUrl, "POST", postData);
      } catch (_err) {
        return false;
      }

      if (results.success) {
        return results;
      }

      if ("undefined" !== typeof results.message) {
        console.error(results.message);
      }
    } catch (e) {
      alert(e.message);
    }
    return false;
  }

  /**
   * @param {string} url
   * @param {string} [method]
   * @param {Object | FormData} [data]
   * @returns {Promise<Object>}
   */
  ajax(url, method, data) {
    // region parse method
    if ("undefined" === typeof method) {
      method = "GET";
    }

    method = method.toUpperCase().trim();

    const isGet = "GET" === method;
    const isPost = "POST" === method;

    if (!(isGet || isPost)) {
      throw new Error(`HTTP ${method} method not supported`);
    }
    // endregion

    this.loaderStart();

    return new Promise((resolve, reject) => {
      // region jQuery Ajax
      if ("undefined" !== typeof window.jQuery) {
        const ajaxOptions = {
          dataType: "json",
          url: url,
          method: method,
          success: (results) => resolve(results),
          error: (jqXHR, textStatus, errorThrown) => {
            console.error("AJAX error: ", textStatus, errorThrown);
            reject(
              new Error(errorThrown || textStatus || "AJAX request failed"),
            );
          },
          complete: () => this.loaderEnd(),
        };

        if ("undefined" !== typeof data) {
          ajaxOptions.data = data;
        }

        window.jQuery.ajax(ajaxOptions);

        return;
      }
      // endregion

      // region ES6 window.fetch
      const fetchOptions = {
        method: method,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      };

      if ("undefined" !== typeof data) {
        if (data instanceof FormData) {
          // FormData: happy path
          if (isGet) {
            throw new Error("GET requests cannot send FormData");
          }

          fetchOptions.body = data;
        } else {
          // plain ol' object: serialize it manually and set the Content-Type header
          const body = new URLSearchParams(data).toString();

          if (isGet) {
            url += (url.includes("?") ? "&" : "?") + body;
          } else {
            fetchOptions.body = body;
            fetchOptions.headers["Content-Type"] =
              "application/x-www-form-urlencoded; charset=UTF-8";
          }
        }
      }

      fetch(url, fetchOptions)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          return response.json();
        })
        .then((results) => resolve(results))
        .catch((error) => {
          console.error("AJAX error:", error);
          reject(error);
        })
        .finally(() => {
          this.loaderEnd();
        });
      // endregion
    });
  }

  /**
   * @param saveUrl
   * @returns {Promise<Object | false>}
   */
  async stashRemoveAsync(saveUrl) {
    let results;

    try {
      results = await this.ajax(saveUrl);
    } catch (_err) {
      return false;
    }

    if (results.success) {
      return results;
    }

    if ("undefined" !== typeof results.message) {
      console.error(results.message);
    }

    return false;
  }

  yesNoDropDown(itemProperties, _viewport) {
    const control = document.createElement("select");
    if (itemProperties.multiSelect) control.multiple = true;
    control.style.width = Math.floor(itemProperties.clientWidth - 3) + "px";
    control.style.height = Math.floor(itemProperties.clientHeight) + "px";
    control.style.textAlign = itemProperties.textAlignment;
    control.id = itemProperties.id;
    control.name = itemProperties.id;
    control.dataset.elementId = itemProperties.dataset.elementId;
    if (
      Math.floor(itemProperties.fontSizeControl) >=
      Math.floor(itemProperties.clientHeight - 2)
    ) {
      control.style.fontSize =
        Math.floor(itemProperties.clientHeight - 3) + "px";
    } else {
      control.style.fontSize = itemProperties.fontSizeControl + "px";
    }
    if (itemProperties.style.border === "1px dashed red") {
      control.style.border = "1px dashed red";
    } else {
      control.style.border = "1px solid #E6E6E6";
    }
    control.style.display = "block";

    let optionElement = document.createElement("option");
    optionElement.value = "";
    optionElement.innerHTML = "";
    if (itemProperties.value === "") {
      optionElement.selected = true;
    }
    control.appendChild(optionElement);

    optionElement = document.createElement("option");
    optionElement.value = "1";
    optionElement.innerHTML = "Yes";
    if (itemProperties.value === "1") {
      optionElement.selected = true;
    }
    control.appendChild(optionElement);

    optionElement = document.createElement("option");
    optionElement.value = "0";
    optionElement.innerHTML = "No";
    if (itemProperties.value === "0") {
      optionElement.selected = true;
    }
    control.appendChild(optionElement);

    if (itemProperties.readOnly) {
      control.disabled = true;
      control.style.cursor = "not-allowed";
    }
    return control;
  }
}

export default PDFJsViewer;
