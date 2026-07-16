# Be sure to restart your server when you modify this file.

# Configure parameters to be partially matched (e.g. passw matches password) and filtered from the log file.
# Use this to limit dissemination of sensitive information.
# See the ActiveSupport::ParameterFilter documentation for supported notations and behaviors.
Rails.application.config.filter_parameters += [
  :passw, :email, :secret, :token, :_key, :crypt, :salt, :certificate, :otp, :ssn, :cvv, :cvc,
  # Teléfonos (ISO A.8.11) — :phone cubre phone/phone_e164/phone_normalized/contact_phone
  # por coincidencia parcial; to_number/from_number (WhatsApp) no contienen "phone".
  :phone, :to_number, :from_number
]
