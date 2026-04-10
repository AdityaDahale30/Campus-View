import Swal from "sweetalert2";

// 🎨 COMMON STYLE (GLASS UI)
const customSwal = Swal.mixin({
  customClass: {
    popup: "glass-popup",
    title: "glass-title",
    confirmButton: "glass-confirm",
    cancelButton: "glass-cancel",
  },
  buttonsStyling: false,
  backdrop: "rgba(0,0,0,0.6)",
  zIndex: 999999,
});

// ✅ SUCCESS
export const showSuccess = (title, text = "") => {
  return customSwal.fire({
    icon: "success",
    title,
    text,
  });
};

// ❌ ERROR
export const showError = (title, text = "") => {
  return customSwal.fire({
    icon: "error",
    title,
    text,
  });
};

// ❓ CONFIRM
export const showConfirm = (title, text = "") => {
  return customSwal.fire({
    icon: "question",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "Cancel",
  });
};

// ⏳ LOADING
export const showLoading = (title = "Please wait...") => {
  Swal.fire({
    title,
    allowOutsideClick: false,
    backdrop: "rgba(0,0,0,0.6)",
    didOpen: () => {
      Swal.showLoading();
    },
    customClass: {
      popup: "glass-popup",
      title: "glass-title",
    },
    zIndex: 999999,
  });
};

export const closeAlert = () => {
  Swal.close();
};