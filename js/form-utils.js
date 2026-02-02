/**
 * Shared form utilities for Fractal marketing pages.
 * Provides validation, loading state, and submission helpers.
 */

/**
 * Clear all error states from a form.
 * @param {HTMLFormElement} form
 */
function clearFormErrors(form) {
    form.querySelectorAll('.form-group').forEach(function(group) {
        group.classList.remove('error');
    });
}

/**
 * Validate that required fields in a form are filled in.
 * Adds .error class to invalid .form-group wrappers.
 * @param {HTMLFormElement} form
 * @param {string[]} fieldIds - IDs of required fields to validate
 * @returns {boolean} true if all fields are valid
 */
function validateFields(form, fieldIds) {
    var isValid = true;
    fieldIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (!el.value.trim() || !el.validity.valid) {
            el.closest('.form-group').classList.add('error');
            isValid = false;
        }
    });
    return isValid;
}

/**
 * Set a submit button to loading state.
 * @param {HTMLButtonElement} btn
 * @param {string} [loadingText='Submitting...']
 * @returns {string} the original button text (for restoring later)
 */
function setButtonLoading(btn, loadingText) {
    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = loadingText || 'Submitting...';
    return original;
}

/**
 * Restore a submit button from loading state.
 * @param {HTMLButtonElement} btn
 * @param {string} originalText
 */
function resetButton(btn, originalText) {
    btn.disabled = false;
    btn.textContent = originalText;
}

/**
 * Submit JSON data to an endpoint and handle success/error.
 * @param {Object} opts
 * @param {string} opts.url - POST endpoint
 * @param {Object} opts.data - JSON body
 * @param {HTMLButtonElement} opts.button - submit button (for loading state)
 * @param {string} [opts.loadingText] - text while submitting
 * @param {function} opts.onSuccess - called with response data on success
 * @param {function} [opts.onError] - called with error; defaults to alert
 */
function submitForm(opts) {
    var originalText = setButtonLoading(opts.button, opts.loadingText);

    fetch(opts.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts.data)
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            opts.onSuccess(data);
        } else {
            throw new Error(data.error || 'Submission failed');
        }
    })
    .catch(function(error) {
        if (opts.onError) {
            opts.onError(error);
        } else {
            alert('Something went wrong. Please try again or email us at hello@fractaltech.nyc');
        }
        resetButton(opts.button, originalText);
    });
}

/**
 * Attach real-time validation listeners to required inputs/textareas.
 * On blur: shows error if empty/invalid. On input: clears error when valid.
 * @param {string} formSelector - CSS selector for the form
 */
function attachRealtimeValidation(formSelector) {
    document.querySelectorAll(formSelector + ' input[required], ' + formSelector + ' textarea[required]').forEach(function(input) {
        input.addEventListener('blur', function() {
            if (!this.value.trim() || !this.validity.valid) {
                this.closest('.form-group').classList.add('error');
            } else {
                this.closest('.form-group').classList.remove('error');
            }
        });
        input.addEventListener('input', function() {
            if (this.value.trim() && this.validity.valid) {
                this.closest('.form-group').classList.remove('error');
            }
        });
    });
}
