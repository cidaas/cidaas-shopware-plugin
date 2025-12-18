import Plugin from "src/plugin-system/plugin.class";
import DomAccess from "src/helper/dom-access.helper";
import HttpClient from "src/service/http-client.service";
import ElementLoadingIndicatorUtil from "src/utility/loading-indicator/element-loading-indicator.util";
import * as $ from "jquery";

export default class CidaasEmailChange extends Plugin {
  init() {
    console.log("CidaasEmailChange 6.4 loaded");

    this.client = new HttpClient();
    this.mailContainer = DomAccess.querySelector(document, "div#accountMailContainer");

    this.$emailForm = $("#emailForm");
    this.$verifyThing = $("#verifyThing");
    this.$emailVerifySpan = $("#emailVerifySpan");
    this.$otpModal = $("#otpModal");
    this.$otpInput = $("#otpInput");
    this.$otpInvalidFeedback = $("#otpInvalidFeedback");
    this.$otpApiError = $("#otpApiError");

    // submit handler
    this.$emailForm.on("submit", this.handleSubmit.bind(this));

    // OTP modal verify
    $("#otpVerifyButton").on("click", this.handleOtpVerify.bind(this));

    // modal close -> show verify section again
    this.$otpModal.on("hidden.bs.modal", () => {
      this.$verifyThing.show();
      this.$otpApiError.hide();
    });

    // Cancel button in verify card
    $("#cancelButton").on("click", () => {
      this.$emailForm.show();
      this.$verifyThing.hide();
      $("#currentEmailError").hide();
      $("#invalidFeedback").hide();
      $("#emailValidateErrorSpan").hide().text("");
    });

    // real-time current-email validation
    const $emailInput = $("#personalMail");
    if ($emailInput.length) {
      $emailInput.on("input", this.validateCurrentEmail.bind(this));
      $emailInput.on("blur", this.validateCurrentEmail.bind(this));
    }
  }

  // new email must differ from current login email
  validateCurrentEmail() {
    const $emailInput = $("#personalMail");
    const currentUserEmail = $("#currentUserEmail").val() || "";
    const $error = $("#currentEmailError");

    if ($emailInput.length === 0 || $error.length === 0) {
      return true;
    }

    const value = ($emailInput.val() || "").trim();

    if (value && value === currentUserEmail) {
      $error.show();
      $emailInput.addClass("is-invalid");
      return false;
    }

    $error.hide();
    $emailInput.removeClass("is-invalid");
    return true;
  }

  // handle email form submit
  handleSubmit(evt) {
    evt.preventDefault();

    if (!this.validateCurrentEmail()) {
      return;
    }

    const email1 = ($("#personalMail").val() || "").trim();
    const email2 = ($("#personalMailConfirmation").val() || "").trim();

    if (email1 === email2) {
      $("#personalMailConfirmation").removeClass("is-invalid");
      $("#invalidFeedback").hide();
      this.changeEmail(email1);
    } else {
      $("#invalidFeedback").show();
      $("#personalMailConfirmation").addClass("is-invalid");
    }
  }

  // change email & show verify step
  changeEmail(email) {
    this.email = email;
    this.$emailForm.hide();
    $("#currentEmailError").hide();
    $("#emailValidateErrorSpan").hide().text("");
    this.$emailVerifySpan.text(email);
    this.$verifyThing.show();

    $("#verifyButton").off("click").on("click", this.handleVerify.bind(this));
  }

  // send OTP
  handleVerify() {
    ElementLoadingIndicatorUtil.create(this.mailContainer);

    const formData = new FormData();
    formData.append("_csrf_token", this.options.csrf);
    formData.append("email", this.email);

    this.client.post(
      "/cidaas/send/change/email/otp",
      formData,
      (res) => {
        ElementLoadingIndicatorUtil.remove(this.mailContainer);

        let data = res;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.error("Invalid JSON response:", data);
            return;
          }
        }

        if (data.success) {
          $("#emailValidateErrorSpan").hide().text("");
          this.$verifyThing.hide();
          this.$otpApiError.hide();
          this.showVerificationModal();
          return;
        }
        const map = window.cidaasOtpErrorTexts || {};
        const code = String(data.code || "");
        const fallback =
          map.fallback || "An error occurred. Please try again.";

        const message =
          (code && map[code]) ||  // 10101 / 10104 from snippets
          data.error ||           // backend text if no mapping
          fallback;               // final fallback

        $("#emailValidateErrorSpan").text(message).show();
        this.$verifyThing.show();
      },
      () => {
        ElementLoadingIndicatorUtil.remove(this.mailContainer);

        const map = window.cidaasOtpErrorTexts || {};
        const fallback =
          map.fallback || "An error occurred. Please try again.";

        $("#emailValidateErrorSpan").text(fallback).show();
        this.$verifyThing.show();
      }
    );
  }


  showVerificationModal() {
    this.$otpApiError.hide();
    this.$otpModal.modal("show");
    this.$otpInput.val("");
    this.$otpInvalidFeedback.hide();
    this.$otpApiError.hide();
  }

  handleOtpVerify() {
    const code = (this.$otpInput.val() || "").trim();
    this.$otpInvalidFeedback.hide();
    this.$otpApiError.hide();

    if (!code) {
      this.$otpInvalidFeedback.show();
      return;
    }

    ElementLoadingIndicatorUtil.create(this.mailContainer);

    const formData = new FormData();
    formData.append("_csrf_token", this.options.csrfverify);
    formData.append("email", this.email);
    formData.append("verificationCode", code);

    this.client.post(
      "/cidaas/verify/change/email",
      formData,
      (res) => {
        ElementLoadingIndicatorUtil.remove(this.mailContainer);

        let data = res;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.error("Invalid JSON response:", data);
            return;
          }
        }

        if (data.success) {
          this.closeVerificationModal();
          this.redirectProfilePath();
        } else {
          this.$otpApiError.show();
          this.$verifyThing.show();
        }
      },
      () => {
        ElementLoadingIndicatorUtil.remove(this.mailContainer);
        this.$otpApiError.show();
        this.$verifyThing.show();
      }
    );
  }

  closeVerificationModal() {
    this.$otpModal.modal("hide");
  }

  redirectProfilePath() {
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    const path = window.location.pathname;
    const localeMatch = path.match(/^\/([a-z]{2})(\/|$)/i);
    const locale = localeMatch ? localeMatch[1] : "";
    const profileUrl = locale
      ? `${baseUrl}/${locale}/account/profile`
      : `${baseUrl}/account/profile`;
    window.location.href = profileUrl;
  }
}
