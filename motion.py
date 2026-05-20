import os
import time
import logging
import requests
import urllib3
from typing import Optional, List

# Matikan warning SSL InsecureRequestWarning (karena kita menggunakan verify=False)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ==============================================================================
# KONFIGURASI BOT MOTION AI (MAGNIFIC KLING V3)
# ==============================================================================
API_KEY = ""  # <-- Opsional: Taruh API Key di sini agar tidak perlu ketik manual terus

# Endpoints sesuai dokumentasi resmi Magnific
ENDPOINT_GENERATE_STD = "https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std"
ENDPOINT_GENERATE_PRO = "https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro"
ENDPOINT_STATUS       = "https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std/"

MAX_IMG_MB = 10
MAX_VID_MB = 100
MAX_QUOTA  = 25
POLL_INTERVAL_SEC = 10
MAX_POLL_ATTEMPTS = 60  # Timeout ~10 menit

DIR_IMG = "./referensi_gambar"
DIR_VID = "./referensi_video"
DIR_OUT = "./hasil_generate"

# Pilih tier: "std" (720p, lebih hemat) atau "pro" (1080p, lebih mahal)
TIER = "std"

# ==============================================================================
# LOGGING SETUP
# ==============================================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("MagnificKlingBot")

# ==============================================================================
# CORE CLASS MAGNIFIC
# ==============================================================================
class MagnificAPI:
    def __init__(self, api_key: str, tier: str = "std"):
        self.headers = {
            "Content-Type": "application/json",
            "x-magnific-api-key": api_key
        }
        if tier == "pro":
            self.endpoint_generate = ENDPOINT_GENERATE_PRO
            self.endpoint_status   = ENDPOINT_GENERATE_PRO + "/"
        else:
            self.endpoint_generate = ENDPOINT_GENERATE_STD
            self.endpoint_status   = ENDPOINT_GENERATE_STD + "/"

    @staticmethod
    def upload_file_public(filepath: str) -> Optional[str]:
        """Upload file lokal ke server publik. Coba Litterbox dulu, fallback ke tmpfiles.org."""
        filename = os.path.basename(filepath)

        # === Opsi 1: Litterbox (catbox.moe) ===
        logger.info(f"Mengupload '{filename}' ke Litterbox...")
        try:
            with open(filepath, "rb") as f:
                response = requests.post(
                    "https://litterbox.catbox.moe/resources/internals/api.php",
                    data={"reqtype": "fileupload", "time": "72h"},
                    files={"fileToUpload": (filename, f)},
                    verify=False,  # <-- FIX SSL Bypass
                    timeout=180
                )
            if response.status_code == 200 and response.text.startswith("https://"):
                url = response.text.strip()
                logger.info(f"✅ Upload Litterbox berhasil: {url}")
                return url
            logger.warning(f"Litterbox gagal ({response.status_code}): {response.text[:100]}")
        except Exception as e:
            logger.warning(f"Litterbox error: {str(e)}")

        # === Opsi 2: tmpfiles.org (pengganti 0x0.st) ===
        logger.info(f"Mencoba fallback upload ke tmpfiles.org...")
        try:
            with open(filepath, "rb") as f:
                response = requests.post(
                    "https://tmpfiles.org/api/v1/upload",
                    files={"file": (filename, f)},
                    verify=False,  # <-- FIX SSL Bypass
                    timeout=180
                )
            if response.status_code == 200:
                data = response.json()
                view_url = data.get("data", {}).get("url", "")
                if view_url:
                    direct_url = view_url.replace("tmpfiles.org/", "tmpfiles.org/dl/")
                    logger.info(f"✅ Upload tmpfiles.org berhasil: {direct_url}")
                    return direct_url
            logger.error(f"tmpfiles.org gagal ({response.status_code}): {response.text[:100]}")
        except Exception as e:
            logger.error(f"tmpfiles.org error: {str(e)}")

        logger.error(f"Semua layanan upload gagal untuk file: {filename}")
        return None

    def generate_motion(self, img_path: str, vid_path: str) -> Optional[str]:
        image_url = self.upload_file_public(img_path)
        video_url = self.upload_file_public(vid_path)

        if not image_url or not video_url:
            logger.error("Gagal mendapatkan URL publik untuk file. Proses dibatalkan.")
            return None

        payload = {
            "image_url": image_url,
            "video_url": video_url,
            "character_orientation": "video",
            "cfg_scale": 0.5,
            "mode": "std" if "std" in self.endpoint_generate else "pro"
        }

        logger.info("Mengirim tugas ke server Magnific...")
        try:
            response = requests.post(
                self.endpoint_generate,
                headers=self.headers,
                json=payload,
                timeout=60
            )

            if response.status_code not in (200, 201, 202):
                logger.error(f"API Error ({response.status_code}): {response.text}")
                return None

            data = response.json()
            
            # Ekstrak task_id dari dalam key "data" jika dibungkus
            if "data" in data and isinstance(data["data"], dict):
                task_id = data["data"].get("task_id") or data["data"].get("id") or data["data"].get("taskId")
            else:
                task_id = data.get("id") or data.get("task_id") or data.get("taskId")

            if not task_id:
                logger.error(f"Gagal mendapatkan Task ID. Response: {data}")
                return None

            return str(task_id)

        except Exception as e:
            logger.error(f"Koneksi Gagal: {str(e)}")
            return None

    def poll_task_status(self, task_id: str) -> Optional[str]:
        poll_url = f"{self.endpoint_status}{task_id}"
        logger.info(f"Tugas masuk antrean [{task_id}]. Memulai pengecekan berkala...")

        for attempt in range(1, MAX_POLL_ATTEMPTS + 1):
            time.sleep(POLL_INTERVAL_SEC)
            try:
                res = requests.get(poll_url, headers=self.headers, timeout=15)

                if res.status_code == 404:
                    alt_url = f"https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro/{task_id}"
                    res = requests.get(alt_url, headers=self.headers, timeout=15)

                if res.status_code != 200:
                    logger.warning(f"Status check HTTP {res.status_code}, mencoba lagi...")
                    continue

                raw_data = res.json()
                
                # Masuk ke dalam key "data" jika API membungkus responsnya
                data = raw_data.get("data", raw_data) if isinstance(raw_data, dict) else raw_data

                status = str(data.get("status", "")).upper()

                if status in ["COMPLETED", "DONE", "SUCCEEDED", "SUCCESS"]:
                    # Cari URL video
                    video_url = (
                        data.get("video_url") or
                        data.get("url") or
                        data.get("output") or
                        (data.get("result", {}).get("video_url") if isinstance(data.get("result"), dict) else None) or
                        (data.get("outputs", [None])[0] if data.get("outputs") else None) or
                        (data.get("generated", [None])[0] if data.get("generated") else None) # FIX TANGKAP LINK GENERATED
                    )
                    
                    if video_url:
                        logger.info("✅ Render Selesai!")
                        return video_url
                    else:
                        logger.error(f"Status COMPLETED tapi URL video tidak ditemukan. Response: {raw_data}")
                        return None

                elif status in ["FAILED", "ERROR", "CANCELLED"]:
                    err_msg = data.get("message") or data.get("error") or "Terjadi kesalahan di server render."
                    logger.error(f"Render Gagal: {err_msg}")
                    return None

                logger.info(f"Status: {status}... (Cek ke-{attempt}/{MAX_POLL_ATTEMPTS})")

            except Exception as e:
                logger.warning(f"Error saat cek status (akan retry): {str(e)}")

        logger.error("Timeout! Render terlalu lama (melebihi batas waktu).")
        return None


# ==============================================================================
# HELPER & RUNNER
# ==============================================================================
def init_system() -> bool:
    for folder in [DIR_IMG, DIR_VID, DIR_OUT]:
        os.makedirs(folder, exist_ok=True)
    return True

def get_valid_files(folder: str, max_mb: int, extensions: tuple) -> List[str]:
    valid_files = []
    if not os.path.exists(folder):
        return valid_files

    for f in sorted(os.listdir(folder)):
        path = os.path.join(folder, f)
        if os.path.isfile(path) and f.lower().endswith(extensions):
            size_mb = os.path.getsize(path) / (1024 * 1024)
            if size_mb <= max_mb:
                valid_files.append(path)
            else:
                logger.warning(f"File diabaikan (lebih dari {max_mb}MB): {f}")
    return valid_files

def download_result(url: str, filename: str) -> bool:
    output_path = os.path.join(DIR_OUT, filename)
    logger.info(f"Mengunduh hasil ke {output_path}...")
    try:
        # Tambahkan verify=False juga di sini biar download aman dari intercept proxy
        response = requests.get(url, stream=True, verify=False, timeout=120)
        response.raise_for_status()
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        logger.info("🎉 Download Selesai!")
        return True
    except Exception as e:
        logger.error(f"Gagal Mengunduh: {str(e)}")
        logger.info(f"Kamu bisa download manual di: {url}")
        return False

def main():
    os.system('cls' if os.name == 'nt' else 'clear')
    print("=" * 60)
    print(" 🚀 MAGNIFIC KLING V3 MOTION CONTROL BOT 🚀 ".center(60))
    print("=" * 60)
    print(f" Mode: {'PRO (1080p)' if TIER == 'pro' else 'STANDARD (720p)'} ".center(60))
    print("=" * 60)

    api_key = API_KEY if API_KEY else input("\n[?] Masukkan API Key Magnific: ").strip()
    if not api_key:
        print("[!] API Key tidak boleh kosong!")
        return

    init_system()
    client = MagnificAPI(api_key, tier=TIER)

    IMG_EXT = ('.jpg', '.jpeg', '.png')
    VID_EXT = ('.mp4', '.mov')

    images = get_valid_files(DIR_IMG, MAX_IMG_MB, IMG_EXT)
    videos = get_valid_files(DIR_VID, MAX_VID_MB, VID_EXT)

    if not images:
        print(f"\n[!] Tidak ada gambar di folder '{DIR_IMG}'. Masukkan file .jpg/.jpeg/.png")
        return
    if not videos:
        print(f"\n[!] Tidak ada video di folder '{DIR_VID}'. Masukkan file .mp4/.mov")
        return

    # Penentuan Pasangan Eksekusi
    if len(videos) == 1:
        tasks = [(img, videos[0]) for img in images]
    elif len(images) == 1:
        tasks = [(images[0], vid) for vid in videos]
    else:
        tasks = list(zip(images, videos))

    print(f"\n[*] Ditemukan {len(images)} gambar & {len(videos)} video")
    print(f"[*] Memulai eksekusi {len(tasks)} tugas...\n")

    usage_count = 0
    for idx, (img_path, vid_path) in enumerate(tasks, 1):
        if usage_count >= MAX_QUOTA:
            logger.warning(f"Batas kuota aman ({MAX_QUOTA}) telah tercapai.")
            break

        print(f"\n{'-' * 50}")
        logger.info(f"MEMPROSES TUGAS [{idx}/{len(tasks)}]")
        logger.info(f"🖼️  {os.path.basename(img_path)}")
        logger.info(f"🎬 {os.path.basename(vid_path)}")

        task_id = client.generate_motion(img_path, vid_path)
        if not task_id:
            logger.warning(f"Tugas [{idx}] dilewati karena gagal submit.")
            continue

        video_url = client.poll_task_status(task_id)
        if not video_url:
            logger.warning(f"Tugas [{idx}] tidak menghasilkan video.")
            continue

        output_filename = f"{os.path.splitext(os.path.basename(img_path))[0]}_kling3.mp4"
        download_result(video_url, output_filename)

        usage_count += 1
        if idx < len(tasks):
            logger.info("Jeda 3 detik sebelum tugas berikutnya...")
            time.sleep(3)

    print(f"\n{'-' * 50}")
    print(f"[=] SELESAI. {usage_count}/{len(tasks)} tugas berhasil. Cek folder: {DIR_OUT} [=]\n")

if __name__ == "__main__":
    main()