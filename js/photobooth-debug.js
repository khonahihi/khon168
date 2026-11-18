
/*
 * KHON Photobooth - Debug v1
 * Chỉ quan sát metadata của request.
 * Không đọc hoặc gửi nội dung ảnh.
 */

(function () {
  try {
    const url = new URL($request.url);
    const method = $request.method || "UNKNOWN";

    // Không ghi URL đầy đủ vì có thể chứa dữ liệu riêng tư.
    console.log("[KHON PHOTOBOOTH] Request detected");
    console.log("[KHON PHOTOBOOTH] Host: " + url.hostname);
    console.log("[KHON PHOTOBOOTH] Path: " + url.pathname);
    console.log("[KHON PHOTOBOOTH] Method: " + method);
    console.log("[KHON PHOTOBOOTH] Time: " + new Date().toISOString());

    // Giữ nguyên request gốc.
    $done({});
  } catch (error) {
    console.log("[KHON PHOTOBOOTH] Debug error");
    $done({});
  }
})();
