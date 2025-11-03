import Plugin from 'src/plugin-system/plugin.class';
import DomAccess from 'src/helper/dom-access.helper';
import HttpClient from 'src/service/http-client.service';
import ElementLoadingIndicatorUtil from 'src/utility/loading-indicator/element-loading-indicator.util';

// Cidaas Email Change Plugin
export default class CidaasEmailChange extends Plugin {
    init() {
        console.log('CidaasEmailChange loaded');
        this.client = new HttpClient();
        this.emailForm = document.getElementById('emailForm');
        this.mailContainer = DomAccess.querySelector(document, 'div#accountMailContainer');

        // OTP modal controls 
        this.verifyPopup = document.getElementById('emailVerifyPopup');
        this.verifyInput = document.getElementById('verifyCodeInput');
        this.verifyButton = document.getElementById('verifySubmitButton'); // "Verify" inside OTP popup
        this.cancelButton = document.getElementById('verifyCancelButton');
        this.errorMsg = document.getElementById('verifyErrorMsg');
        this.confirmButton = document.getElementById('verifyButton'); // "Confirm" button for sending OTP

        // Bind events once
        if (this.emailForm) {
            this.emailForm.addEventListener('submit', this.handleSubmit.bind(this));
        }
        if (this.confirmButton) {
            this.confirmButton.addEventListener('click', this.handleVerify.bind(this));
        }
        if (this.verifyButton) {
            this.verifyButton.addEventListener('click', this.handleOtpVerify.bind(this));
        }
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', this.handleOtpCancel.bind(this));
        }
    }

    // Utility sleep function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Handle form submission (Email Change)
    handleSubmit(evt) {
        evt.preventDefault();
        console.log('Form submit JS triggered');
        let email1 = document.getElementById('personalMail').value.trim();
        let email2 = document.getElementById('personalMailConfirmation').value.trim();
        if (email1 === email2) {
            document.getElementById('personalMailConfirmation').classList.remove('is-invalid');
            document.getElementById('invalidFeedback').style.display = 'none';
            this.changeEmail(email1);
        } else {
            document.getElementById('invalidFeedback').style.display = 'block';
            document.getElementById('personalMailConfirmation').classList.add('is-invalid');
        }
    }

    // Change email process, show confirm step
    changeEmail(email1) {
        this.email = email1;
        this.emailForm.style.display = 'none';
        document.getElementById('emailVerifySpan').textContent = email1;
        document.getElementById('verifyThing').style.display = 'block';
    }

    // Handle Confirm click (Send OTP to new email)
    handleVerify() {
        // Loader on confirm/verification section, not full page
        ElementLoadingIndicatorUtil.create(this.verifyPopup);
        this.setVerificationControlsEnabled(false);

        this.client.post('/cidaas/send/change/email/otp', JSON.stringify({
            email: this.email
        }), (res) => {
            ElementLoadingIndicatorUtil.remove(this.verifyPopup);
            this.setVerificationControlsEnabled(true);

            let data = res;
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.error('Invalid JSON response:', data);
                    return;
                }
            }
            if (data.success) {
                this.showVerificationPopup();
            } else {
                this.errorMsg.textContent = data.message || 'Failed to send verification code. Try again.';
                this.errorMsg.style.display = 'block';
            }
        });
    }

    // Show OTP verification popup
    showVerificationPopup() {
        // Show OTP entry modal
        if (this.verifyInput) this.verifyInput.value = '';
        if (this.errorMsg) this.errorMsg.style.display = 'none';
        if (this.verifyPopup) this.verifyPopup.style.display = 'flex';
        this.setVerificationControlsEnabled(true);
    }

    // Handle OTP verification inside popup
    handleOtpVerify() {
        const code = this.verifyInput.value.trim();
        if (!code) {
            this.errorMsg.textContent = "Code is required!";
            this.errorMsg.style.display = 'block';
            return;
        }
        this.errorMsg.style.display = 'none';

        ElementLoadingIndicatorUtil.create(this.verifyPopup);
        this.setVerificationControlsEnabled(false);

        this.client.post('/cidaas/verify/change/email', JSON.stringify({
            email: this.email,
            verificationCode: code
        }), (res) => {
            ElementLoadingIndicatorUtil.remove(this.verifyPopup);
            this.setVerificationControlsEnabled(true);

            let data = res;
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.error('Invalid JSON response:', data);
                    return;
                }
            }
            if (data.success) {
                this.verifyPopup.style.display = 'none';
                this.redirectProfilePath();
            } else {
                this.errorMsg.textContent = data.message || "Code is incorrect!";
                this.errorMsg.style.display = 'block';
            }
        });
    }

    // Handle OTP modal cancel
    handleOtpCancel() {
        if (this.verifyPopup) this.verifyPopup.style.display = 'none';
        if (this.verifyInput) this.verifyInput.value = '';
        if (this.errorMsg) this.errorMsg.style.display = 'none';
        this.setVerificationControlsEnabled(true);
    }

    // Enable/disable controls in OTP popup
    setVerificationControlsEnabled(enabled) {
        if (this.verifyButton) this.verifyButton.disabled = !enabled;
        if (this.cancelButton) this.cancelButton.disabled = !enabled;
        if (this.verifyInput) this.verifyInput.disabled = !enabled;
        if (this.confirmButton) this.confirmButton.disabled = !enabled;
    }

    // Redirect after success
    redirectProfilePath() {
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        const path = window.location.pathname;
        const localeMatch = path.match(/^\/([a-z]{2})(\/|$)/i);
        const locale = localeMatch ? localeMatch[1] : '';
        const profileUrl = locale ? `${baseUrl}/${locale}/account/profile` : `${baseUrl}/account/profile`;
        window.location.href = profileUrl;
    }
}
