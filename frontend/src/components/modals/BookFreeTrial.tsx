"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Phone, User, Calendar, Clock, ChevronDown } from "lucide-react";
import { useState, useEffect, useId } from "react";
import { toast } from "react-toastify";
import { ZodError } from "zod";
import type { BookFreeTrialProps, TrialFormData } from "@/types";
import { submitTrialBooking } from "@/lib/api";
import { trialBookingSchema, type TrialBookingFormData } from "@/lib/validations";
import { COUNTRY_OPTIONS, formatPhoneInput, placeholderForCountry, type SupportedCountry } from "@/lib/phone";

export default function BookFreeTrial({ isOpen, onClose }: BookFreeTrialProps) {
  const [formData, setFormData] = useState<TrialBookingFormData>({
    name: "",
    email: "",
    phone: "",
    country: "US",
    childAge: "",
    preferredDate: "",
    preferredTime: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [minDate] = useState(() => new Date().toLocaleDateString("en-CA"));

  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const countryId = useId();
  const ageId = useId();
  const dateId = useId();
  const timeId = useId();

  useEffect(() => {
    // Body scroll lock to prevent background scrolling when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setFormData((prev) => ({ ...prev, phone: formatPhoneInput(value, prev.country as SupportedCountry) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCountrySelect = (country: SupportedCountry) => {
    setFormData((prev) => ({ ...prev, country, phone: formatPhoneInput(prev.phone, country) }));
    if (errors.country) {
      setErrors((prev) => ({ ...prev, country: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate with Zod
    try {
      const validatedData = trialBookingSchema.parse(formData);

      try {
        await submitTrialBooking(validatedData as TrialFormData);
        toast.success("Trial booked. We will contact you shortly.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
        setFormData({
          name: "",
          email: "",
          phone: "",
          country: "US",
          childAge: "",
          preferredDate: "",
          preferredTime: "",
        });
        setErrors({});
        setTimeout(() => onClose(), 400);
      } catch {
        toast.error("We could not book this right now. Please call or WhatsApp us.", {
          position: "top-center",
          autoClose: 3500,
          theme: "colored",
        });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        // Build a field → first-error-message map from Zod's flattened errors
        const flat = error.flatten().fieldErrors;
        const errorMap: Record<string, string> = {};
        for (const [field, messages] of Object.entries(flat)) {
          const msgs = messages as string[] | undefined;
          if (msgs && msgs.length > 0) {
            errorMap[field] = msgs[0];
          }
        }
        setErrors(errorMap);
        toast.error("Please fix the errors in the form.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#1D1A17]/60 backdrop-blur-[4px]"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
          >
            <div className="bg-white border-b border-gray-100 p-5 sm:p-6 flex items-center justify-between shrink-0 z-10">
              <div>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl sm:text-2xl font-bold text-[#1D1A17]">
                  Book Free Trial
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
                  Start your chess journey today ♟️
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close form"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-[#D86B45] hover:text-white transition-all active:scale-90"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar"
            >
              <div>
                <label
                  htmlFor={nameId}
                  className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5"
                >
                  Parent&apos;s Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-[#D86B45] transition-colors" />
                  <input
                    id={nameId}
                    name="name"
                    type="text"
                    required
                    maxLength={50}
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 h-[48px] rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#D86B45] focus:ring-4 focus:ring-[#D86B45]/10 outline-none transition-all text-base text-[#1D1A17]"
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={emailId}
                  className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-[#D86B45] transition-colors" />
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    required
                    maxLength={80}
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 h-[48px] rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#D86B45] focus:ring-4 focus:ring-[#D86B45]/10 outline-none transition-all text-base text-[#1D1A17]"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={phoneId}
                  className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5"
                >
                  Phone
                </label>
                <div className="flex gap-2">
                  <div className="relative shrink-0">
                    <select
                      id={countryId}
                      name="country"
                      aria-label="Country"
                      value={formData.country}
                      onChange={(e) => handleCountrySelect(e.target.value as SupportedCountry)}
                      className="h-[48px] pl-3 pr-7 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#D86B45] focus:ring-4 focus:ring-[#D86B45]/10 outline-none transition-all appearance-none text-base cursor-pointer text-[#1D1A17]"
                    >
                      {COUNTRY_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.flag} {option.dialCode}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>

                  <div className="relative group flex-1">
                    <Phone className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] text-gray-400 group-focus-within:text-[#D86B45] transition-colors" />
                    <input
                      id={phoneId}
                      name="phone"
                      type="tel"
                      required
                      inputMode="numeric"
                      maxLength={12}
                      autoComplete="tel-national"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 sm:pl-11 pr-2 h-[48px] rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#D86B45] focus:ring-4 focus:ring-[#D86B45]/10 outline-none transition-all text-base text-[#1D1A17]"
                      placeholder={placeholderForCountry((formData.country as SupportedCountry) || "US")}
                    />
                  </div>
                </div>
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.phone}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label
                    htmlFor={ageId}
                    className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5"
                  >
                    Age
                  </label>
                  <div className="relative group">
                    <select
                      id={ageId}
                      name="childAge"
                      required
                      value={formData.childAge}
                      onChange={handleChange}
                      className="w-full pl-4 pr-8 sm:pr-10 h-[48px] rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#D86B45] focus:ring-4 focus:ring-[#D86B45]/10 outline-none transition-all appearance-none text-base cursor-pointer text-[#1D1A17]"
                    >
                      <option value="" disabled hidden>
                        Select
                      </option>
                      <option value="5-7">5-7 yrs</option>
                      <option value="8-10">8-10 yrs</option>
                      <option value="11-13">11-13 yrs</option>
                      <option value="14-16">14-16 yrs</option>
                      <option value="16+">16+ yrs</option>
                    </select>
                    <ChevronDown className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                <div>
                  <label
                    htmlFor={dateId}
                    className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5"
                  >
                    Trial Date
                  </label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-[#D86B45] transition-colors z-10" />

                    <input
                      id={dateId}
                      type="date"
                      name="preferredDate"
                      min={minDate}
                      required
                      value={formData.preferredDate}
                      onChange={handleChange}
                      className={`w-full pl-11 pr-4 h-[48px] rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#D86B45] focus:ring-4 focus:ring-[#D86B45]/10 outline-none transition-all text-base 
                      [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer 
                      ${formData.preferredDate ? "text-[#1D1A17]" : "text-transparent"}`}
                    />

                    {!formData.preferredDate && (
                      <span className="absolute left-11 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-base">
                        Select date
                      </span>
                    )}

                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={timeId}
                    className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5"
                  >
                    Time Slot
                  </label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-[#D86B45] transition-colors z-10" />
                    <select
                      id={timeId}
                      name="preferredTime"
                      required
                      value={formData.preferredTime}
                      onChange={handleChange}
                      className={`w-full pl-11 pr-10 h-[48px] rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#D86B45] focus:ring-4 focus:ring-[#D86B45]/10 outline-none transition-all appearance-none text-base cursor-pointer ${formData.preferredTime ? "text-[#1D1A17]" : "text-gray-400"}`}
                    >
                      <option value="" disabled hidden>
                        Select time
                      </option>
                      <option value="morning" className="text-[#1D1A17]">
                        Morning (10 AM - 12 PM)
                      </option>
                      <option value="afternoon" className="text-[#1D1A17]">
                        Afternoon (2 PM - 5 PM)
                      </option>
                      <option value="evening" className="text-[#1D1A17]">
                        Evening (5 PM - 8 PM)
                      </option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="pt-2 sm:pt-4">
                <button
                  type="submit"
                  className="w-full bg-[#1D1A17] hover:bg-[#D86B45] text-white h-[52px] rounded-xl font-bold uppercase tracking-[0.15em] text-[13px] shadow-[0_8px_15px_-8px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_20px_-8px_rgba(216,107,69,0.5)] active:scale-[0.98] transition-all duration-300"
                >
                  Confirm Booking
                </button>
                <p className="text-[12px] text-gray-400 text-center font-medium mt-3 pb-1">
                  We&apos;ll call you within 24 hours to confirm.
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
