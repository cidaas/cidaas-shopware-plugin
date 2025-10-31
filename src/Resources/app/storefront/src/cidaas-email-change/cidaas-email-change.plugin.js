import Plugin from 'src/plugin-system/plugin.class';
import DomAccess from 'src/helper/dom-access.helper';
import HttpClient from 'src/service/http-client.service';
import ElementLoadingIndicatorUtil from 'src/utility/loading-indicator/element-loading-indicator.util';

// Cidaas Email Change Plugin
export default class CidaasEmailChange extends Plugin {
    init() {
        console.log('CidaasEmailChange loaded');
        this.client = new HttpClient();
        const emailForm = document.getElementById('emailForm');
        emailForm.addEventListener('submit', this.handleSubmit.bind(this));
        this.mailContainer = DomAccess.querySelector(document, 'div#accountMailContainer');

        //  Added for OTP modal controls 
        this.verifyPopup = document.getElementById('emailVerifyPopup');
        this.verifyInput = document.getElementById('verifyCodeInput');
        this.verifyButton = document.getElementById('verifySubmitButton');
        this.cancelButton = document.getElementById('verifyCancelButton');
        this.errorMsg = document.getElementById('verifyErrorMsg');

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

    // Handle form submission
    handleSubmit(evt) {
        evt.preventDefault();
        console.log('Form submit JS triggered');
        let email1 = document.getElementById('personalMail').value;
        let email2 = document.getElementById('personalMailConfirmation').value;
        if (email1 === email2) {
            document.getElementById('personalMailConfirmation').classList.remove('is-invalid');
            document.getElementById('invalidFeedback').style.display = 'none';
            this.changeEmail(email1);

        } else {
            document.getElementById('invalidFeedback').style.display = 'block';
            document.getElementById('personalMailConfirmation').classList.add('is-invalid');
        }
    }

    // Change email process
    async changeEmail(email1) {
        this.email = email1
        document.getElementById('emailForm').style.display = 'none';
        document.getElementById('emailVerifySpan').textContent = email1;
        document.getElementById('verifyThing').style.display = 'block';
        document.getElementById('verifyButton').addEventListener('click', this.handleVerify.bind(this));
    }


    // Handle verify button click
    handleVerify() {
        //  Call API to SEND verification code to email1 
        ElementLoadingIndicatorUtil.create(this.mailContainer);
        this.client.post('/cidaas/send/change/email/otp', JSON.stringify({
            email: this.email
        }), (res) => {
            ElementLoadingIndicatorUtil.remove(this.mailContainer);
            let data = res;
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.error('Invalid JSON response:', data);
                    return;
                }
            }
            //On success, show OTP modal 
            if (data.success) {
                this.showVerificationPopup();
            } else {
                console.log(res.message || 'Failed to send verification code. Try again.');
            }
        });
    }

    // Show OTP verification popup
    showVerificationPopup() {
        // Show OTP entry modal
        if (this.verifyInput) this.verifyInput.value = '';
        if (this.errorMsg) this.errorMsg.style.display = 'none';
        if (this.verifyPopup) this.verifyPopup.style.display = 'flex';
    }
    // Handle OTP verification
    handleOtpVerify() {
        const code = this.verifyInput.value.trim();
        if (!code) {
            this.errorMsg.textContent = "Code is required!";
            this.errorMsg.style.display = 'block';
            return;
        }
        this.errorMsg.style.display = 'none';
        ElementLoadingIndicatorUtil.create(this.mailContainer);
        //Call API to validate OTP
        this.client.post('/cidaas/verify/change/email', JSON.stringify({
            email: this.email,
            verificationCode: code
        }), (res) => {
            console.log('OTP verification response:', res);
            ElementLoadingIndicatorUtil.remove(this.mailContainer);
            let data = res;
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.error('Invalid JSON response:', data);
                    return;
                }
            }
            //On success, show OTP modal 
            if (data.success) {
               //  On success, call original email change logic 
               this.verifyPopup.style.display = 'none';
               this.redirectProfilePath();
            } else {
                this.errorMsg.textContent = res.message || "Code is incorrect!";
                this.errorMsg.style.display = 'block';
            }

        });
    }

    // Handle OTP cancel
    handleOtpCancel() {
        if (this.verifyPopup) this.verifyPopup.style.display = 'none';
        if (this.verifyInput) this.verifyInput.value = '';
        if (this.errorMsg) this.errorMsg.style.display = 'none';
    }

    // //  change email fucntion has been moved this path /cidaas/verify/change/email
    // changeEmailAfterVerification() {
    //     ElementLoadingIndicatorUtil.create(this.mailContainer);
    //     this.client.post('/cidaas/change/email', JSON.stringify({
    //         email: this.email
    //     }), (res) => {
    //         ElementLoadingIndicatorUtil.remove(this.mailContainer);
    //         this.redirectProfilePath();
    //     });
    // }

    // Redirect to profile page
    redirectProfilePath() {
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        const path = window.location.pathname;
        const localeMatch = path.match(/^\/([a-z]{2})(\/|$)/i);
        const locale = localeMatch ? localeMatch[1] : '';
        const profileUrl = locale ? `${baseUrl}/${locale}/account/profile` : `${baseUrl}/account/profile`;
        window.location.href = profileUrl;
    }
}