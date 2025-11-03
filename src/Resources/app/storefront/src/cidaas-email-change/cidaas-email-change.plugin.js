import Plugin from 'src/plugin-system/plugin.class';
import DomAccess from 'src/helper/dom-access.helper';
import HttpClient from 'src/service/http-client.service';
import ElementLoadingIndicatorUtil from 'src/utility/loading-indicator/element-loading-indicator.util';

import * as $ from 'jquery';

export default class CidaasEmailChange extends Plugin {
    init() {
        this.client = new HttpClient();
        this.mailContainer = DomAccess.querySelector(document, 'div#accountMailContainer');

        // Form submit handler
        $('#emailForm').on('submit', this.handleSubmit.bind(this));

        // OTP modal verify button handler
        $('#otpVerifyButton').on('click', this.handleOtpVerify.bind(this));
    }

    handleSubmit(evt) {
        evt.preventDefault();

        const email1 = $('#personalMail').val();
        const email2 = $('#personalMailConfirmation').val();

        if (email1 === email2) {
            $('#personalMailConfirmation').removeClass('is-invalid');
            $('#invalidFeedback').hide();

            this.changeEmail(email1);
        } else {
            $('#invalidFeedback').show();
            $('#personalMailConfirmation').addClass('is-invalid');
        }
    }

    changeEmail(email) {
        this.email = email;
        $('#emailForm').hide();
        $('#emailVerifySpan').text(email);
        $('#verifyThing').show();

        // Set handler for verify button click
        $('#verifyButton').off('click').on('click', this.handleVerify.bind(this));
    }

    handleVerify() {
        ElementLoadingIndicatorUtil.create(this.mailContainer);

        const formData = new FormData();
        // Use CSRF token for email form submission
        formData.append('_csrf_token', this.options.csrf);
        formData.append('email', this.email);

        this.client.post(
            '/cidaas/send/change/email/otp',
            formData,
            (res) => {
                ElementLoadingIndicatorUtil.remove(this.mailContainer);
                if (res) {
                    $('#verifyThing').hide();
                    this.openOtpModal();
                } else {
                    $('#verifyThing').hide();
                    alert(res && res.message ? res.message : 'Email verification initiation failed.');
                }
            },
            () => {
                ElementLoadingIndicatorUtil.remove(this.mailContainer);
                alert('Network error. Please try again.');
            }
        );
    }

    openOtpModal() {
        $('#otpModal').modal('show');
        $('#otpInput').val('');
        $('#otpInvalidFeedback').hide();
    }

    handleOtpVerify() {
        const code = $('#otpInput').val().trim();
        if (!code || code.length !== 6) {
            $('#otpInvalidFeedback').show();
            return;
        }

        $('#otpInvalidFeedback').hide();
        ElementLoadingIndicatorUtil.create(this.mailContainer);

        const formData = new FormData();
        // Use CSRF token for verification route
        formData.append('_csrf_token', this.options.csrfverify);
        formData.append('email', this.email);
        formData.append('verificationCode', code);

        this.client.post(
            '/cidaas/verify/change/email',
            formData,
            (res) => {
                ElementLoadingIndicatorUtil.remove(this.mailContainer);
                if (res) {
                    this.closeOtpModal();
                    alert('Email change verified successfully.');
                    this.redirectProfilePath();
                } else {
                    $('#otpInvalidFeedback').show();
                }
            },
            () => {
                ElementLoadingIndicatorUtil.remove(this.mailContainer);
                alert('Network error. Please try again.');
            }
        );
    }

    closeOtpModal() {
        $('#otpModal').modal('hide');
    }

    redirectProfilePath() {
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        const path = window.location.pathname;
        const localeMatch = path.match(/^\/([a-z]{2})(\/|$)/i);
        const locale = localeMatch ? localeMatch[1] : '';
        const profileUrl = locale ? `${baseUrl}/${locale}/account/profile` : `${baseUrl}/account/profile`;
        window.location.href = profileUrl;
    }
}
