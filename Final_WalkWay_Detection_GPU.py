import cv2
import numpy as np
import threading
import torch
import warnings
from ultralytics import YOLO
import time
import pyodbc
import math
import cvzone
from datetime import datetime, timedelta
import os
import requests
import logging
import gc
from concurrent.futures import ThreadPoolExecutor

warnings.filterwarnings("ignore", category=FutureWarning)

# =============================================================================
# GPU CONFIGURATION
# =============================================================================

torch.backends.cudnn.benchmark = True
torch.backends.cudnn.deterministic = False
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True

def setup_gpu():
    """Setup and configure GPU for optimal performance"""
    if torch.cuda.is_available():
        device_count = torch.cuda.device_count()
        current_device = torch.cuda.current_device()
        device_name = torch.cuda.get_device_name(current_device)
        gpu_memory = torch.cuda.get_device_properties(current_device).total_memory
        
        print(f"GPU Setup:")
        print(f"   Available GPUs: {device_count}")
        print(f"   Current Device: {current_device} ({device_name})")
        print(f"   GPU Memory: {gpu_memory / 1024**3:.1f} GB")
        
        torch.cuda.empty_cache()
        torch.cuda.set_per_process_memory_fraction(0.8)
        
        return f"cuda:{current_device}"
    else:
        print("CUDA not available, using CPU")
        return "cpu"

DEVICE = setup_gpu()

# =============================================================================
# GPU MODEL MANAGER CLASS
# =============================================================================

class GPUModelManager:
    """Manages YOLO models with GPU optimization"""
    
    def __init__(self, device):
        self.device = device
        self.person_model = None
        self.forklift_model = None
        self.logger = logging.getLogger(__name__)
        self.load_models()
    
    def load_models(self):
        """Load YOLO models with GPU optimization"""
        try:
            self.logger.info(f"Loading YOLO models on {self.device}...")
            
            # Load person detection model
            self.person_model = YOLO("C:/Users/Administrator/Desktop/Code_Project_AI_GPU/Walkway detection/Models/yolo11n.pt")
            self.person_model.to(self.device)
            
            # Load forklift detection model
            self.forklift_model = YOLO("C:/Users/Administrator/Desktop/Code_Project_AI_GPU/Walkway detection/Models/folklift_person_detect_v2.pt")
            self.forklift_model.to(self.device)
            
            # *** REMOVED HALF PRECISION TO FIX ERROR ***
            # Don't use half precision to avoid dtype mismatch
            # if self.device.startswith('cuda'):
            #     self.person_model.model.half()
            #     self.forklift_model.model.half()
            #     torch.cuda.synchronize()
            
            if self.device.startswith('cuda'):
                torch.cuda.synchronize()
            
            # Warm up models
            self._warmup_models()
            
            self.logger.info(f"Models loaded successfully on {self.device}")
            
        except Exception as e:
            self.logger.error(f"Error loading models: {e}")
    
    def _warmup_models(self):
        """Warm up models with dummy inference"""
        try:
            dummy_frame = np.random.randint(0, 255, (400, 500, 3), dtype=np.uint8)
            
            with torch.no_grad():
                _ = self.person_model(dummy_frame, verbose=False)
                _ = self.forklift_model(dummy_frame, verbose=False)
                
            if self.device.startswith('cuda'):
                torch.cuda.synchronize()
            
            self.logger.info("Models warmed up successfully")
            
        except Exception as e:
            self.logger.warning(f"Model warmup failed: {e}")
    
    def predict_person(self, frame, conf_threshold=0.5):
        """GPU-optimized person prediction"""
        try:
            with torch.no_grad():
                results = self.person_model(
                    frame,
                    conf=conf_threshold,
                    device=self.device,
                    verbose=False,
                    stream=False
                )
            return results
        except Exception as e:
            self.logger.error(f"Person prediction error: {e}")
            return None
    
    def predict_forklift(self, frame, conf_threshold=0.5):
        """GPU-optimized forklift prediction"""
        try:
            with torch.no_grad():
                results = self.forklift_model(
                    frame,
                    conf=conf_threshold,
                    device=self.device,
                    verbose=False,
                    stream=False
                )
            return results
        except Exception as e:
            self.logger.error(f"Forklift prediction error: {e}")
            return None
    
    def cleanup(self):
        """Clean up GPU memory"""
        if self.device.startswith('cuda'):
            torch.cuda.empty_cache()
            gc.collect()

# =============================================================================
# DATABASE MANAGER CLASS
# =============================================================================

class DatabaseManager:
    """Manages database connections and operations"""
    
    def __init__(self):
        self.config = {
            "server": os.getenv("DB_SERVER_1", "BKCSR093\\SQLPRO"),
            "database": os.getenv("DB_NAME_1", "IOT"),
            "driver": os.getenv("DB_DRIVER", "{ODBC Driver 17 for SQL Server}"),
            "port": os.getenv("DB_PORT", 1433),
            "username": os.getenv("DB_USER_1", "iotconnect"),
            "password": os.getenv("DB_PASS_1", "sql@m1n!^")
        }
        self.config_2 = {
            "server": os.getenv("DB_SERVER_2", "SQLCLUSTER"),
            "database": os.getenv("DB_NAME_2", "Line_notify"),
            "driver": os.getenv("DB_DRIVER", "{ODBC Driver 17 for SQL Server}"),
            "port": os.getenv("DB_PORT", 1433),
            "username": os.getenv("DB_USER_2", "sqldev"),
            "password": os.getenv("DB_PASS_2", "sqldev@2023")
        }
        self.connection = None
        self.connection_2 = None
        self.logger = logging.getLogger(__name__)

    def connect_to_database(self, config):
        """Connect to database"""
        try:
            return pyodbc.connect(
                f"Driver={config['driver']};"
                f"Server={config['server']};"
                f"Database={config['database']};"
                f"Port={config['port']};"
                f"UID={config['username']};"
                f"PWD={config['password']};"
            )
        except Exception as e:
            self.logger.error(f"Failed to connect to database: {e}")
            return None

    def get_connection(self, use_secondary=False):
        """Get database connection"""
        if use_secondary:
            if not self.connection_2:
                self.connection_2 = self.connect_to_database(self.config_2)
            return self.connection_2
        else:
            if not self.connection:
                self.connection = self.connect_to_database(self.config)
            return self.connection

    def execute_query(self, query, params=None, use_secondary=False):
        """Execute database query"""
        connection = self.get_connection(use_secondary)
        if not connection:
            self.logger.error("No database connection available.")
            return None
        try:
            with connection.cursor() as cursor:
                cursor.execute(query, params or ())
                if query.strip().upper().startswith("SELECT"):
                    return cursor.fetchall()
                else:
                    connection.commit()
                    return None
        except Exception as e:
            self.logger.error(f"Error executing query: {e}")
            return None

    def execute_stored_procedure(self, proc_name, *params):
        """Execute stored procedure"""
        connection = self.get_connection(use_secondary=True)
        if not connection:
            self.logger.error("No database connection available for stored procedure.")
            return None
        try:
            with connection.cursor() as cursor:
                placeholders = ', '.join('?' for _ in params) if params else ''
                command = f"EXEC {proc_name} {placeholders}".strip()
                cursor.execute(command, params or ())
                if cursor.description:
                    return cursor.fetchall()
                else:
                    connection.commit()
                    return None
        except Exception as e:
            self.logger.error(f"Error executing stored procedure: {e}")
            return None

    def insert_root_record(self, image_drive, image_folder, created_by="CCTV camera by AI"):
        """Insert root record to database"""
        try:
            current_time = datetime.now()
            command = f"""
                INSERT INTO [IOT].[ww].[trn_camera_record_location] 
                (image_drive, image_folder, created_by, created_at ,is_transfer) values (
                '{image_drive}' , '{image_folder}', '{created_by}', '{current_time.strftime('%Y-%m-%d %H:%M:%S')}',0)
            """
            result = self.execute_query(command)
            return result
        except Exception as e:
            self.logger.error(f"Error at insert_root_record function: {e}")
            return None
    
    def insert_log_detection(self, camera_no, image_name, drive_name, image_folder, created_by="CCTV camera by AI"):
        """Insert detection log to database"""
        try:
            created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            query_information = f"SELECT location,leader_id,foreman_id FROM [IOT].[ww].[mst_camera] WHERE camera_no = '{camera_no}'"
            result = self.execute_query(query_information)
            
            if not result or len(result) == 0:
                self.logger.warning(f"No data found for camera {camera_no}. Inserting log failed.")
                return
            
            location = result[0][0] if result[0][0] is not None else ''  
            leader_id = result[0][1] if result[0][1] is not None else '' 
            foreman_id = result[0][2] if result[0][2] is not None else ''  
            
            insert_query = (
                "INSERT INTO [IOT].[ww].[trn_camera_detect] (camera_no, image_name, location, leader_id, foreman_id, created_at,is_transfer)"
                f"VALUES ({camera_no}, '{image_name}', '{location}', '{leader_id}', '{foreman_id}', '{created_at}',0)"
            )
            
            self.execute_query(insert_query)
            self.logger.info(f"Insert log detection for camera {camera_no} successfully.")
            
            self.insert_root_record(drive_name, image_folder, created_by)
            self.logger.info(f"Insert root record for camera {camera_no} successfully.")
            
        except Exception as e:
            self.logger.error(f"Error at insert_log_detection function: {e}")
            return None

    def close_connections(self):
        """Close database connections"""
        if self.connection:
            self.connection.close()
            self.connection = None
        if self.connection_2:
            self.connection_2.close()
            self.connection_2 = None

# =============================================================================
# ALERT MANAGER CLASS
# =============================================================================

class AlertManager:
    """Manages alert notifications and file operations"""
    
    def __init__(self):
        self.LINE_NOTIFY_TOKEN = 's2lZ21Z7TNsLX9z29oQJqwM6h8Dqt649uV92rzYoeQM'
        self.directory_base = "\\\\10.145.250.26\\DataCenter\\000-CenterApp\\042-Walkway Detection"
        self.account_id = "C250157ccadaeb004e9b50c48a86c9c3f"
        self.channel_token = "prVLd1YtjdSORjyjIOKRcuV+zO29LAQsThX7+WNElITX5nBWzF6M1TUBLpbF5u2V2Ks+RDCwP+LNIvnl7DIJPrPOoU86BZiXR9R8JGhc7Eu5wwrOSgEiDVAeEOgW8XD+J/KTAknRRBTWl0F2N7X1yAdB04t89/1O/w1cDnyilFU="
        self.grp_id = "ST-2"
        self.logger = logging.getLogger(__name__)
        self.db_manager = DatabaseManager()

    def create_alert_message(self, timestamp, camera_no):
        """Create alert message for Line notification"""
        if isinstance(timestamp, str):
            timestamp = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S')

        query_information = f"SELECT location,leader_id,foreman_id FROM [IOT].[ww].[mst_camera] WHERE camera_no = '{camera_no}'"
        result_location = self.db_manager.execute_query(query_information)
        
        store_query = self.db_manager.execute_stored_procedure("rpa.line_get_next_seq", self.grp_id)
        running_number = store_query[0][0]

        self.logger.info(f"Alert ID: {running_number}")
        
        if camera_no in ["5", "62", "81", "82", "106", "107", "162", "213", "223"]:
          return (
                 f"{running_number}"
                f"🚨 Walkway Detection 🎥\n"
                f"วัน-เวลาที่ตรวจพบ ➡️ {timestamp.strftime('%d-%m-%Y %H:%M:%S')} น.\n"
                f"พื้นที่ ➡️ {result_location[0][0]}\n"
                f"รายละเอียดความผิดปกติ ➡️ พบบุคคลหรือจักรยานไม่อยู่ในพื้นที่ปลอดภัย\n"
                f"หัวข้อการตรวจ ➡️ 2.วิธีการทำงานของพนักงาน\n"
                f"ประเภทความเสี่ยง  ➡️  Unsafe Condition\n"
                f"กฎความปลอดภัย พื้นฐาน 15 ข้อ ➡️ 2. รักษาการตรวจสอบความปลอดภัยและสภาพแวดล้อมในการทำงาน\n"
                f"ประเภทการตรวจ ➡️ 5. การตรวจสอบความปลอดภัยโดย CCTV\n"
            )
        else:
            return (
                f"{running_number}\n"  # Include the alert ID
                f"\n🚨 Walkway Detection 🎥\n"
                f"วัน-เวลาที่ตรวจพบ ➡️ {timestamp.strftime('%d-%m-%Y %H:%M:%S')} น.\n"
                f"พื้นที่ ➡️ {result_location[0][0]}\n"
                f"รายละเอียดความผิดปกติ ➡️ พบบุคคลไม่เดินในพื้นที่ปลอดภัย\n"
                f"หัวข้อการตรวจ ➡️ 2.วิธีการทำงานของพนักงาน\n"
                f"ประเภทความเสี่ยง  ➡️  Unsafe Condition\n"
                f"กฎความปลอดภัย พื้นฐาน 15 ข้อ ➡️ 2. รักษาการตรวจสอบความปลอดภัยและสภาพแวดล้อมในการทำงาน\n"
                f"ประเภทการตรวจ ➡️ 5. การตรวจสอบความปลอดภัยโดย CCTV\n"
            )
    
    def send_line_notify(self, message, camera_no, image_name):
        """Send Line notification with image"""
        message_api_url = 'https://api.line.me/v2/bot/message/push'
        headers = {
            'Authorization': f'Bearer {self.channel_token}',
            'Content-Type': 'application/json'
        }

        payload = {
            "to": self.account_id,
            "messages": [
                {
                    "type": "text",
                    "text": message
                }
            ]
        }

        #base_url = "https://line-notify.bkc.co.th/LINE_PHOTO"
        base_url = "https://ticket.bkc.co.th"

        date_folder = datetime.now().strftime('%Y%m%d')
        base_folder = f"042-Walkway%20Detection/Camera%20{camera_no}/{date_folder}"
        image_url = f"{base_url}/{base_folder}/{image_name}" 

        self.logger.info(f"Image URL: {image_url}")

        if image_url.startswith("https://"):
            payload['messages'].append({
                "type": "image",
                "originalContentUrl": image_url,
                "previewImageUrl": image_url
            })

        try:
            response = requests.post(message_api_url, headers=headers, json=payload)
            self.logger.info(f"Response Status Code: {response.status_code}")

            if response.status_code == 200:
                update_running_number = self.db_manager.execute_stored_procedure("rpa.line_update_next_seq", self.grp_id)
                self.logger.info('Message and image sent successfully!')
            else:
                self.logger.error(f'Failed to send. Status: {response.status_code}, Response: {response.text}')
                
        except Exception as e:
            self.logger.error(f'Error sending message: {e}')

    def save_to_local_file(self, data, camera_no):
        """Save detection data to local file system"""
        try:
            if not os.path.exists(self.directory_base):
                os.makedirs(self.directory_base)
                
            camera_directory = os.path.join(self.directory_base, f"Camera {camera_no}")
            current_date = datetime.now().strftime('%Y%m%d')
            date_directory = os.path.join(camera_directory, current_date)

            os.makedirs(date_directory, exist_ok=True)

            image_name = f"detection_camera_no_{camera_no}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            text_name = f"detection_camera_no_{camera_no}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"

            image_path = os.path.join(date_directory, image_name) 
            cv2.imwrite(image_path, data['image'])
                
            text_file_path = os.path.join(date_directory, text_name)

            with open(text_file_path, 'w') as file:
                file.write(f"Timestamp: {data['timestamp']}\n")
                file.write(f"Image Path: {image_path}\n")
                
            # Parse path for database storage
            path_parts = image_path.split("\\")
            image_drive = f"\\{path_parts[1]}\\{path_parts[2]}\\{path_parts[3]}\\"
            image_folder = "\\".join(path_parts[4:8]) 
            image_name = os.path.basename(image_path)
            

            return image_drive, image_folder, image_name
        

        except Exception as e:
            self.logger.error(f"Error saving to local file: {e}")
            return None, None, None
        
    def save_data_for_validation(self, data, camera_no, directory_base="\\\\10.145.250.26\\DataCenter\\002-ICT\\Thitiwut\\Data_validation_camera\\Walkway"):
        """Save data for validation purposes"""
        try:
            if not os.path.exists(directory_base):
                os.makedirs(directory_base)
                
            image_name = f"detection_camera_no_{camera_no}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            image_path = os.path.join(directory_base, image_name)
            cv2.imwrite(image_path, data['image'])
            
            return image_path

        except Exception as e:
            self.logger.error(f"Error saving validation data: {e}")
            return None

# =============================================================================
# AREA MANAGER CLASS
# =============================================================================

class AreaManager:
    """Manages detection areas for cameras"""
    
    def __init__(self):
        self.area_definitions = self._define_areas()
    
    def _define_areas(self):
        """Define detection areas for each camera"""
        return {
            "1": [
                # (350, 50, 135, 125),
                np.array([(60,399),(49,294),(43,169),(335,82),(400,110),(481,152),(499,184),(499,284),(497,399)],np.int32),

            ],
            "5": [
                np.array([(120,270),(46,262),(84,189),(125,100),(170,27),(194,28),(199,97),(203,182),(213,274)], np.int32),
                np.array([(248,396),(3,396),(1,347),(162,377),(329,372),(443,349),(496,330),(498,395)], np.int32),
            ],
            "8": [
                np.array([(176,364),(284,344),(293,362),(364,338),(268,198),(201,105),(173,63),(136,63),(141,112),(150,212)], np.int32),
            ],
            "20": [
                np.array([(121,398),(263,398),(334,398),(243,242),(211,188),(103,202),(109,284)],np.int32),
                np.array([(103,168),(193,161),(165,111),(156,94),(101,98),(101,122)],np.int32),
            ],
            "27": [
                np.array([(180,395),(296,394),(393,396),(319,271),(275,195),(242,136),(211,86),(184,85),(187,97),(180,98),(180,132),(179,201)], np.int32)
            ],
            "28": [
                np.array([(4,318),(83,342),(171,353),(191,239),(204,177),(128,174),(116,198),(2,189),(2,253)], np.int32),
                np.array([(274,395),(270,326),(231,324),(233,243),(237,193),(346,203),(438,210),(469,250),(497,291),(496,397),(370,398)], np.int32),
                np.array([(237,154),(320,158),(395,163),(345,114),(311,77),(238,74),(238,109)], np.int32)
            ],
            "31":[np.array([(1,398),(4,203),(41,191),(89,225),
                            (155,183),(255,224),(367,263),(290,397),
                            (152,397)], np.int32),
                np.array([(198,158),(297,102),(372,61),(419,62),
                            (469,80),(454,138),(427,223),(400,228),
                            (283,190)], np.int32),
            ],

            "33":[np.array([(3,398),(3,247),(112,242),(194,230),
                            (333,238),(457,243),(497,246),(496,320),
                            (496,355),(396,397),(197,396)], np.int32),
                   ],
            "38": [
                np.array([(420,240),(326,181),(325,142),(387,141),(451,139),(490,186),(491,240)], np.int32),
                np.array([(1,398),(1,199),(35,202),(85,202),(103,208),(140,225),(210,239),(304,250),(427,251),(496,249),(496,397),(203,398)], np.int32),
            ],
            "39": [
                np.array([(2,387),(3,360),(69,328),(62,322),(1,314),(2,222),(49,204),(95,229),(135,254),(170,277),(235,307),(296,332),(384,363),(371,388),(172,388)], np.int32),
                np.array([(175,240),(245,270),(344,311),(405,328),(421,295),(431,210),(454,169),(464,152),(411,140),(356,166),(290,195),(230,219)], np.int32)
            ],
            
            "55":[np.array([(168,65),(241,74),(212,142),(153,286),(2,231),(2,149),(103,93)], np.int32)],

            "62": [
                np.array([(2,397),(144,396),(250,397),(308,296),(340,237),(377,159),(402,97),(359,85),(325,85),(259,117),(168,164),(38,202),(4,220),(1,302)], np.int32)
            ],
            "71": [
                np.array([(287,397),(275,397),(149,254),(6,164),(5,148),(143,92),(243,66),(355,95),
                          (355,107),(420,122),(482,254),(331,209)
                          ], np.int32),
                np.array([(2,398),(187,398),(110,280),(1,202)], np.int32),


            ],
            "79": [
                np.array([(117,126),(205,107),(173,86),(134,65),(85,38),(75,40),(77,55),(80,79)], np.int32),
                np.array([(257,99),(324,89),(292,78),(269,77),(238,66),(187,44),(184,63),(222,79)], np.int32),
                np.array([(274,109),(334,141),(387,171),(444,204),(474,176),(406,138),(388,121),(340,97),(310,102)], np.int32),
                np.array([(85,398),(250,398),(497,398),(496,298),(408,234),(432,217),(370,179),(315,150),(250,112),(193,121),(127,138),(100,147),(61,154),(3,187),(4,275),(53,264),], np.int32),
            ],
            "81": [
                np.array([(368,398),(499,398),(499,316),(499,202),(499,105),(478,95),(418,115),(344,89),(280,106),(199,130),(133,149),(140,154),(149,155),(203,208),(280,278),(262,289)], np.int32),
                np.array([(116,130),(175,110),(260,86),(244,82),(180,64),(140,54),(69,76),(88,100)], np.int32)
            ],
            "82": [
                np.array([(159,398),(315,398),(498,398),(498,270),(498,171),(400,168),(337,89),(306,55),(284,31),(246,32),(238,59),(227,100),(212,157),(176,157),(73,158),(2,236),(2,306),(2,398),(84,398),], np.int32)
            ],
            "93": [
                np.array([(498,329),(498,294),(304,250),(208,224),(88,193),(57,198),(111,224),(143,241),(163,237),(252,271),(337,295),(449,321),(498,329)], np.int32),
                np.array([(498,293),(497,252),(263,207),(237,200),(283,190),(237,200),(283,190),(206,177),(156,170),(79,185),(88,192),(208,225),(304,250)], np.int32),
            ],
            "105": [
                np.array([(173,60),(134,61),(92,62),(123,121),(198,248),(294,397),(393,397),(499,396),(499,315),(497,249),(374,167),(285,117),(215,81)], np.int32)
            ],
            "106": [
                np.array([(43,77),(128,71),(170,100),(231,143),(333,207),(412,241),(498,266),(499,323),(499,396),(381,398),(37,397),(21,309),(28,202),(36,121),(44,78)], np.int32)
            ],
            "107": [
                np.array([(2,258),(2,346),(144,297),(246,249),(318,213),(353,187),(345,175),(302,139),(261,105),(247,105),(266,130),(294,169),(287,178),(220,200),(131,224)], np.int32)
            ],
            "108": [
                np.array([(3,397),(125,398),(262,397),(264,310),(264,222),(131,209),(2,190),(3,266)], np.int32),
                np.array([(300,228),(316,282),(343,397),(498,397),(499,296),(499,234),(470,224),(453,209),(439,195),(371,187),(361,220)], np.int32)
            ],
            "114": [
                np.array([(119,195),(249,222),(391,247),(391,229),(381,215),(356,121),(336,56),(326,45),(286,40),(261,80),(222,155),(178,180)],np.int32)
            ],
            "146": [
                np.array([(319,397),(474,397),(386,220),(334,134),(295,74),(279,51),(263,49),(265,71),(281,144),(298,251)], np.int32)
            ],
            "148": [
                np.array([(214,398),(286,397),(420,397),(499,397),(498,320),(336,334),(215,341)], np.int32),
                np.array([(95,172),(148,231),(192,279),(272,276),(387,278),(498,275),(285,152),(182,89),(184,109),(161,135)], np.int32),
                np.array([(182,89),(165,75),(243,62),(319,51),(337,60),(257,75)], np.int32),
            ],
            "149": [
                np.array([(160,145),(230,145),(240,74),(209,75),(176,118)], np.int32),
                np.array([(2,305),(251,305),(498,305),(498,203),(377,198),(253,197),(120,196),(67,233),(3,264)], np.int32),
            ],
            "150": [
                np.array([(2,311),(220,311),(497,311),(497,254),(348,190),(225,192),(2,209)], np.int32),
                np.array([(215,124),(305,117),(286,82),(258,40),(248,20),(248,21),(237,21),(231,39),(224,79),(214,125),(175,128)], np.int32)
            ],
            "159": [
                np.array([(330,397),(496,398),(403,267),(352,189),(286,98),(254,51),(239,43),(225,39),(223,46),(239,99),(270,189),(300,290)], np.int32)
            ],
            "162": [
                np.array([(2,102),(2,178),(2,268),(64,310),(154,346),(229,367),(311,372),(410,357),(476,334),(499,310),(499,237),(498,184),(469,202),(419,228),(373,246),(322,246),(241,236),(139,194),(82,159),(41,129),], np.int32)
            ],
            "180": [
                np.array([(220,397),(341,397),(497,397),(497,357),(344,256),(253,190),(232,198),(226,193),(164,217),(121,233),(165,310)], np.int32),
                np.array([(77,210),(137,190),(191,174),(148,141),(104,107),(67,76),(49,59),(48,53),(34,47),(14,51),(19,65),(28,92),(40,126),(57,167)], np.int32)
            ],
            "213": [
                np.array([(89,185),(146,184),(205,185),(225,113),(140,118)], np.int32),
                np.array([(150,109),(189,105),(227,104),(233,74),(201,76),(175,78)], np.int32),
            ],
            "223": [
                np.array([(320,165),(330,206),(404,212),(473,217),(456,197),(442,179)], np.int32),
                np.array([(376,239),(394,319),(415,397),(441,397),(497,397),(498,317),(497,245),(429,243)], np.int32),
                np.array([(305,102),(313,135),(405,145),(372,109)],np.int32),
            ],         
        }
    
    def get_areas(self, camera_no):
        """Get areas for specific camera"""
        return self.area_definitions.get(camera_no, [])
    
    def draw_areas(self, frame, camera_no):
        """Draw detection areas on frame"""
        areas = self.get_areas(camera_no)
        for area in areas:
            if isinstance(area, tuple):
                x, y, w, h = area
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
            else:
                cv2.polylines(frame, [area], isClosed=True, color=(0, 0, 255), thickness=1)
    
    def get_detection_color(self, camera_no, x1, y1, x2, y2):
        """Get detection color based on area and position"""
        areas = self.get_areas(camera_no)
        for area in areas:
            if isinstance(area, tuple):
                x, y, w, h = area
                if (y1 < y + h) and (y2 > y) and (x1 < x + w) and (x2 > x): 
                    return (0, 0, 255)  # Alert red color
            else:
                corners = [
                    (x1, y2),  # Bottom-left
                    (x2, y2)   # Bottom-right
                ]
                
                all_inside = all(cv2.pointPolygonTest(area, corner, False) >= 0 for corner in corners)
                if all_inside:
                    return (0, 0, 255)  # Alert red color
            
        return (0, 255, 0)  # Safe green color

# =============================================================================
# OBJECT DETECTOR CLASS
# =============================================================================

class ObjectDetector:
    """Handles object detection and processing"""
    
    def __init__(self, model_manager, area_manager):
        self.model_manager = model_manager
        self.area_manager = area_manager
        self.target_classes = ['person', 'bicycle']
        self.target_classes_2 = ['forkLift']
        self.logger = logging.getLogger(__name__)
    
    def detect_objects(self, frame, camera_no, last_detection_times, last_alert_times, time_for_open_camera, alert_manager, db_manager):
        """GPU-optimized object detection"""
        if not self.model_manager.person_model or not self.model_manager.forklift_model:
            self.logger.error("Models not loaded. Skipping detection.")
            return
        
        # GPU-optimized inference
        results = self.model_manager.predict_person(frame, conf_threshold=0.5)
        results_forklift = self.model_manager.predict_forklift(frame, conf_threshold=0.5)
        
        if not results or not results_forklift:
            return
        
        # Initialize detection variables
        detected_objects = {
            'person': {'detected': False, 'boxes': []},
            'bicycle': {'detected': False, 'boxes': []},
            'forklift': {'detected': False, 'boxes': []},
            'car': {'detected': False, 'boxes': []}
        }
        
        current_time = datetime.now()
        
        # Initialize detection time for the camera if not already set
        if camera_no not in last_detection_times:
            last_detection_times[camera_no] = None
        
        # Process forklift detection results
        self._process_forklift_detection(results_forklift, detected_objects, frame)
        
        # Process person/bicycle detection results
        self._process_person_detection(results, detected_objects, frame, camera_no, 
                                     current_time, last_detection_times, last_alert_times, 
                                     time_for_open_camera, alert_manager, db_manager)
        
        # Clean up GPU memory periodically
        if camera_no == "1":
            self.model_manager.cleanup()
    
    def _process_forklift_detection(self, results_forklift, detected_objects, frame):
        """Process forklift detection results"""
        for r in results_forklift:
            boxes = r.boxes
            for box_forklift in boxes:
                x1, y1, x2, y2 = map(int, box_forklift.xyxy[0])
                confidence = math.ceil((box_forklift.conf[0] * 100)) / 100
                cls = int(box_forklift.cls[0])
                label_2 = self.model_manager.forklift_model.names[int(cls)]
                
                if label_2 in self.target_classes_2 and confidence > 0.5:
                    if label_2 == "forkLift":
                        detected_objects['forklift']['boxes'].append((x1, y1, x2, y2))
                        detected_objects['forklift']['detected'] = True
                        
                        forklift_color = (0, 255, 0)  # Green color for forklift
                        cv2.rectangle(frame, (x1, y1), (x2, y2), forklift_color, 2)
                        cvzone.putTextRect(frame, 'Fork lift', (max(0, x1), max(12, y1)), 
                                         scale=1, thickness=0, colorB=forklift_color, 
                                         colorT=(255, 255, 255), colorR=forklift_color, offset=0)
    
    def _process_person_detection(self, results, detected_objects, frame, camera_no, 
                            current_time, last_detection_times, last_alert_times, 
                            time_for_open_camera, alert_manager, db_manager):
        """Process person/bicycle detection results"""
        for r in results:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                confidence = math.ceil((box.conf[0] * 100)) / 100
                cls = int(box.cls[0])
                label = self.model_manager.person_model.names[int(cls)]
                
                if label in self.target_classes and confidence > 0.5:
                    # Store detection information
                    if label == "person":
                        detected_objects['person']['boxes'].append((x1, y1, x2, y2))
                        detected_objects['person']['detected'] = True
                    elif label == "bicycle":
                        detected_objects['bicycle']['boxes'].append((x1, y1, x2, y2))
                        detected_objects['bicycle']['detected'] = True
                    elif label in ["car", "bus", "truck"]:
                        detected_objects['car']['boxes'].append((x1, y1, x2, y2))
                        detected_objects['car']['detected'] = True
                    
                    # Skip if forklift is detected to avoid conflicts
                    if label == "person" and detected_objects['forklift']['detected']:
                        continue
                    
                    # Determine color for THIS specific box
                    box_color = self.area_manager.get_detection_color(camera_no, x1, y1, x2, y2)
                    
                    # Check if this person is close to any bicycle
                    is_close_to_bicycle = False
                    if label == "person":
                        for bicycle_box in detected_objects['bicycle']['boxes']:
                            if self._is_close((x1, y1, x2, y2), bicycle_box, threshold=70):
                                is_close_to_bicycle = True
                                self.logger.info("Person is close to bicycle")
                                break
                    
                    # Override color if person is close to bicycle
                    if is_close_to_bicycle:
                        box_color = (0, 255, 0)  # Green for safe
                    
                    # Draw bounding box for THIS specific detection
                    cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                    display_label = 'bicycle' if label == 'bicycle' else label
                    cvzone.putTextRect(frame, display_label, (max(0, x1), max(12, y1)), 
                                    scale=1, thickness=0, colorB=box_color, colorT=(255, 255, 255), 
                                    colorR=box_color, offset=0)
                    
                    # Process detection logic for THIS specific box
                    self._process_single_detection_logic(camera_no, label, box_color, current_time, 
                                                    frame, last_detection_times, last_alert_times, 
                                                    time_for_open_camera, alert_manager, db_manager,
                                                    detected_objects)
                    

    def _process_single_detection_logic(self, camera_no, label, color, current_time, 
                                  frame, last_detection_times, last_alert_times, 
                                  time_for_open_camera, alert_manager, db_manager, detected_objects):
        """Process detection logic for a single detection"""
        detected_forklift = detected_objects['forklift']['detected']
        detected_car = detected_objects['car']['detected']
        
        if camera_no in ["5", "62", "81", "82", "106", "107", "162", "213", "223"]:
            self._handle_safety_zone_single_detection(camera_no, label, color, current_time, 
                                                    frame, last_detection_times, last_alert_times, 
                                                    time_for_open_camera, alert_manager, db_manager,
                                                    detected_forklift, detected_car)
        elif camera_no in ["114"]:
            self._handle_parking_single_detection(camera_no, label, color, current_time, 
                                                frame, last_detection_times, last_alert_times, 
                                                time_for_open_camera, alert_manager, db_manager,
                                                detected_forklift, detected_car)
        else:
            self._handle_general_single_detection(camera_no, label, color, current_time, 
                                                frame, last_detection_times, last_alert_times, 
                                                time_for_open_camera, alert_manager, db_manager,
                                                detected_forklift, detected_car)
            
    def _handle_safety_zone_single_detection(self, camera_no, label, color, current_time, 
                                       frame, last_detection_times, last_alert_times, 
                                       time_for_open_camera, alert_manager, db_manager,
                                       detected_forklift, detected_car):
        """Handle detection logic for safety zone cameras - single detection"""
        if label == "person" and (detected_forklift or detected_car):
            self.logger.info("Person detected with forklift/car. No alert triggered.")
            return
        
        if color == (0, 255, 0):  # Green - safe area
            self.logger.info(f"{label} in safety area")
            last_detection_times[camera_no] = None
            return

        elif color == (0, 0, 255):  # Red - prohibited area
            self._handle_unsafe_detection(camera_no, current_time, frame, last_detection_times, 
                                        last_alert_times, time_for_open_camera, alert_manager, 
                                        db_manager, f"{label} in prohibited area")

    def _handle_parking_single_detection(self, camera_no, label, color, current_time, 
                                        frame, last_detection_times, last_alert_times, 
                                        time_for_open_camera, alert_manager, db_manager,
                                        detected_forklift, detected_car):
        """Handle detection logic for parking cameras - single detection"""
        if label == "person" and (detected_forklift or detected_car):
            self.logger.info("Person detected with forklift/car. No alert triggered.")
            return
        
        if label == "bicycle" and color == (0, 0, 255):
            self._handle_unsafe_detection(camera_no, current_time, frame, last_detection_times, 
                                        last_alert_times, time_for_open_camera, alert_manager, 
                                        db_manager, "bicycle in prohibited parking area")
        else:
            last_detection_times[camera_no] = None

    def _handle_general_single_detection(self, camera_no, label, color, current_time, 
                                    frame, last_detection_times, last_alert_times, 
                                    time_for_open_camera, alert_manager, db_manager,
                                    detected_forklift, detected_car):
        """Handle detection logic for general cameras - single detection"""
        if label == "person" and (detected_forklift or detected_car):
            return
        
        if color == (0, 255, 0):  # Green - safe area
            last_detection_times[camera_no] = None
            return

        elif label == "person" and color == (0, 0, 255):  # Red - prohibited area
            self._handle_unsafe_detection(camera_no, current_time, frame, last_detection_times, 
                                        last_alert_times, time_for_open_camera, alert_manager, 
                                        db_manager, "person in prohibited area")
        else:
            last_detection_times[camera_no] = None



    
    def _check_proximity(self, detected_objects, threshold=70):
        """Check if person and bicycle are close to each other"""
        for person_box in detected_objects['person']['boxes']:
            for bicycle_box in detected_objects['bicycle']['boxes']:
                if self._is_close(person_box, bicycle_box, threshold):
                    self.logger.info("Person and bicycle are close to each other")
                    return True
        return False
    
    def _is_close(self, box1, box2, threshold=70):
        """Check if two objects are close to each other"""
        x1, y1, x2, y2 = box1
        x1_b, y1_b, x2_b, y2_b = box2
        distance = min(abs(x1 - x2_b), abs(x1_b - x2))
        return distance < threshold
    
    def _draw_detection_boxes(self, frame, detected_objects, color, label):
        """Draw detection bounding boxes"""
        # Draw person boxes
        for person_box in detected_objects['person']['boxes']:
            x1, y1, x2, y2 = person_box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cvzone.putTextRect(frame, label, (max(0, x1), max(12, y1)), 
                             scale=1, thickness=0, colorB=color, colorT=(255, 255, 255), 
                             colorR=color, offset=0)
        
        # Draw bicycle boxes
        for bicycle_box in detected_objects['bicycle']['boxes']:
            x1, y1, x2, y2 = bicycle_box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cvzone.putTextRect(frame, 'bicycle', (max(0, x1), max(12, y1)), 
                             scale=1, thickness=0, colorB=color, colorT=(255, 255, 255), 
                             colorR=color, offset=0)
    
    def _process_detection_logic(self, camera_no, detected_objects, color, current_time, 
                               frame, last_detection_times, last_alert_times, 
                               time_for_open_camera, alert_manager, db_manager):
        """Process detection logic for different camera types"""
        detected_person = detected_objects['person']['detected']
        detected_bicycle = detected_objects['bicycle']['detected']
        detected_forklift = detected_objects['forklift']['detected']
        detected_car = detected_objects['car']['detected']
        
        if camera_no in ["5", "62", "81", "82", "106", "107", "162", "213", "223"]:
            self._handle_safety_zone_cameras(camera_no, detected_person, detected_bicycle, 
                                            detected_forklift, detected_car, color, 
                                            current_time, frame, last_detection_times, 
                                            last_alert_times, time_for_open_camera, 
                                            alert_manager, db_manager)
        elif camera_no in ["114"]:
            self._handle_parking_cameras(camera_no, detected_person, detected_bicycle, 
                                        detected_forklift, detected_car, color, 
                                        current_time, frame, last_detection_times, 
                                        last_alert_times, time_for_open_camera, 
                                        alert_manager, db_manager)
        else:
            self._handle_general_cameras(camera_no, detected_person, detected_bicycle, 
                                       detected_forklift, detected_car, color, 
                                       current_time, frame, last_detection_times, 
                                       last_alert_times, time_for_open_camera, 
                                       alert_manager, db_manager)
    
    def _handle_safety_zone_cameras(self, camera_no, detected_person, detected_bicycle, 
                                  detected_forklift, detected_car, color, current_time, 
                                  frame, last_detection_times, last_alert_times, 
                                  time_for_open_camera, alert_manager, db_manager):
        """Handle detection logic for safety zone cameras"""
        if detected_person and (detected_forklift or detected_car):
            self.logger.info("Person detected with forklift/car. No alert triggered.")
            return
        
        if (detected_person and color == (0, 255, 0)) or (detected_bicycle and color == (0, 255, 0)):
            self.logger.info("Object in safety area")
            last_detection_times[camera_no] = None
            return
    
        elif (detected_person and color == (0, 0, 255)) or (detected_bicycle and color == (0, 0, 255)):
            self._handle_unsafe_detection(camera_no, current_time, frame, last_detection_times, 
                                        last_alert_times, time_for_open_camera, alert_manager, 
                                        db_manager, "person or bicycle in prohibited area")
    
    def _handle_parking_cameras(self, camera_no, detected_person, detected_bicycle, 
                              detected_forklift, detected_car, color, current_time, 
                              frame, last_detection_times, last_alert_times, 
                              time_for_open_camera, alert_manager, db_manager):
        """Handle detection logic for parking cameras"""
        if detected_person and (detected_forklift or detected_car):
            self.logger.info("Person detected with forklift/car. No alert triggered.")
            return
        
        if detected_bicycle and color == (0, 0, 255):
            self._handle_unsafe_detection(camera_no, current_time, frame, last_detection_times, 
                                        last_alert_times, time_for_open_camera, alert_manager, 
                                        db_manager, "bicycle in prohibited parking area")
        else:
            last_detection_times[camera_no] = None
    
    def _handle_general_cameras(self, camera_no, detected_person, detected_bicycle, 
                              detected_forklift, detected_car, color, current_time, 
                              frame, last_detection_times, last_alert_times, 
                              time_for_open_camera, alert_manager, db_manager):
        """Handle detection logic for general cameras"""
        if detected_person and (detected_forklift or detected_car):
            # self.logger.info("Person detected with forklift/car. No alert triggered.")
            return
        
        if (detected_person and color == (0, 255, 0)) or (detected_bicycle and color == (0, 255, 0)):
            # self.logger.info("Person walking in safety area")
            last_detection_times[camera_no] = None
            return
    
        elif detected_person and color == (0, 0, 255):
            self._handle_unsafe_detection(camera_no, current_time, frame, last_detection_times, 
                                        last_alert_times, time_for_open_camera, alert_manager, 
                                        db_manager, "person in prohibited area")
        else:
            last_detection_times[camera_no] = None
    
    def _handle_unsafe_detection(self, camera_no, current_time, frame, last_detection_times, 
                               last_alert_times, time_for_open_camera, alert_manager, 
                               db_manager, message):
        """Handle unsafe detection with timing logic"""
        if last_detection_times[camera_no] is None:
            last_detection_times[camera_no] = current_time
        else:
            time_difference = (current_time - last_detection_times[camera_no]).total_seconds()
            # self.logger.info(f"Time difference for camera {camera_no}: {time_difference}s")

            if time_difference > 10:  # Trigger after 30 seconds
                last_alert_time = last_alert_times.get(camera_no, None)
                if (last_alert_time is None or 
                    (datetime.now() - last_alert_time) > timedelta(seconds=time_for_open_camera)):
                    
                    self.logger.warning(f"Alert triggered: {message} on camera {camera_no}")
                    self._handle_detection(frame, camera_no, alert_manager, db_manager, last_alert_times)
                    last_detection_times[camera_no] = None
    
    def _handle_detection(self, frame, camera_no, alert_manager, db_manager, last_alert_times):
        """Handle detection for alert message and save image"""
        current_time = datetime.now()
        timestamp = current_time.strftime('%Y-%m-%d %H:%M:%S')
        data = {'image': frame, 'timestamp': timestamp}

        try:
            image_drive, image_folder, image_name = alert_manager.save_to_local_file(data, camera_no)
            alert_manager.save_data_for_validation(data, camera_no)
            
            db_manager.insert_log_detection(camera_no, image_name, image_drive, image_folder)
            
            alert_message = alert_manager.create_alert_message(timestamp, camera_no)
            # alert_manager.send_line_notify(alert_message, camera_no, image_name)
            
            last_alert_times[camera_no] = current_time
            self.logger.info(f"Detection handled successfully for camera {camera_no}")
            
        except Exception as e:
            self.logger.error(f"Failed to handle detection for camera {camera_no}: {e}")

# =============================================================================
# CAMERA PROCESSOR CLASS
# =============================================================================

class CameraProcessor:
    """Main camera processing class"""
    
    def __init__(self):
        self.model_manager = GPUModelManager(DEVICE)
        self.area_manager = AreaManager()
        self.alert_manager = AlertManager()
        self.db_manager = DatabaseManager()
        self.object_detector = ObjectDetector(self.model_manager, self.area_manager)
        
        self.cameras = self._configure_camera()
        self.last_alert_times = {}
        self.last_detection_times = {}
        self.batch_size = 2
        self.time_for_open_camera = 120
        
        self.logger = self._setup_logger()
    
    def _setup_logger(self):
        """Setup logging configuration with UTF-8 encoding"""
        # Create a custom formatter without emojis
        formatter = logging.Formatter(
            "%(asctime)s - %(levelname)s - %(message)s",
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Setup file handler with UTF-8 encoding
        file_handler = logging.FileHandler("walkway_detection.log", encoding='utf-8')
        file_handler.setFormatter(formatter)
        
        # Setup console handler with UTF-8 encoding
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        
        # Configure logger
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.INFO)
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
        return logger

    def _configure_camera(self):
        """Camera configuration for RTSP Protocol"""
        cameras = [
            # {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.1", "port_number": 554, "camera_no": "1"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.8", "port_number": 554, "camera_no": "8"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.20", "port_number": 554, "camera_no": "20"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.180", "port_number": 554, "camera_no": "180"},  
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.27", "port_number": 554, "camera_no": "27"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.28", "port_number": 554, "camera_no": "28"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.31", "port_number": 554, "camera_no": "31"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.33", "port_number": 554, "camera_no": "33"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.38", "port_number": 554, "camera_no": "38"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.39", "port_number": 554, "camera_no": "39"},
            # {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.55", "port_number": 554, "camera_no": "55"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.62", "port_number": 554, "camera_no": "62"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.71", "port_number": 554, "camera_no": "71"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.79", "port_number": 554, "camera_no": "79"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.81", "port_number": 554, "camera_no": "81"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.82", "port_number": 554, "camera_no": "82"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.93", "port_number": 554, "camera_no": "93"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.105", "port_number": 554, "camera_no": "105"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.106", "port_number": 554, "camera_no": "106"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.148", "port_number": 554, "camera_no": "148"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.107", "port_number": 554, "camera_no": "107"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.108", "port_number": 554, "camera_no": "108"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.114", "port_number": 554, "camera_no": "114"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.159", "port_number": 554, "camera_no": "159"},
            # {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.146", "port_number": 554, "camera_no": "146"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.149", "port_number": 554, "camera_no": "149"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.162", "port_number": 554, "camera_no": "162"},
            {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.150", "port_number": 554, "camera_no": "150"},
            # {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.213", "port_number": 554, "camera_no": "213"},
            # {"username": "admin", "password": "Komatsu@2016!", "ip_address": "192.168.0.223", "port_number": 554, "camera_no": "223"},
        ]
        return cameras

    def _is_time_in_except_ranges(self):
        """Check time for exercise period exclusion"""
        current_time = datetime.now()
        except_time = self.db_manager.execute_query(
            "SELECT startime,endtime FROM [IOT].[ww].[mst_camera_except_time] where description != 'Except Carpark'"
        )
        
        if not except_time:
            return False

        for window in except_time:
            if len(window) < 2:
                self.logger.warning(f"Invalid window length: {window}")
                continue
            
            start, end = window 
            start_time = current_time.replace(hour=start.hour, minute=start.minute)
            end_time = current_time.replace(hour=end.hour, minute=end.minute)

            if end_time < start_time:
                end_time = end_time.replace(day=end_time.day + 1)
            
            if start_time <= current_time <= end_time:
                self.logger.info(f"Camera excluded due to exercise time: {start_time} to {end_time}")
                return True
        
        return False
            
    def _is_time_in_except_ranges_carpark(self):
        """Check time for carpark exclusion"""
        current_time = datetime.now()
        except_carpark = self.db_manager.execute_query(
            "SELECT startime,endtime FROM [IOT].[ww].[mst_camera_except_time] where description = 'Except Carpark'"
        )
        
        if not except_carpark:
            return False
        
        for window in except_carpark:
            if len(window) < 2:
                self.logger.warning(f"Invalid window length: {window}")
                continue
            
            start, end = window 
            start_time = current_time.replace(hour=start.hour, minute=start.minute)
            end_time = current_time.replace(hour=end.hour, minute=end.minute)

            if end_time < start_time:
                end_time = end_time.replace(day=end_time.day + 1)
            
            if start_time <= current_time <= end_time:
                self.logger.info(f"Carpark camera excluded: {start_time} to {end_time}")
                return True
        
        return False
          
    def process_camera_stream(self, cam_url, camera):
        """Process camera stream with GPU optimization"""
        cap = cv2.VideoCapture(cam_url)
        
        # Set camera properties for better performance
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_FPS, 60)

        camera_no = camera['camera_no']
        
        if not cap.isOpened():
            self.logger.error(f"Failed to open stream: {cam_url}")
            return
            
        self.logger.info(f"Starting camera {camera_no} stream processing on GPU")
        start_time_detected = time.time()
        
        def stream():
            frame_count = 0
            fps_start_time = time.time()
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    self.logger.error(f"Failed to capture frame from: {cam_url}")
                    break
                
                if not isinstance(frame, np.ndarray) or frame.size == 0:
                    self.logger.error("Invalid frame received.")
                    return

                frame = cv2.resize(frame, (500, 400), cv2.INTER_AREA)
                
                # Add GPU processing indicator
                text = "Walkway Detection"
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 0.5
                font_thickness = 1
                text_size = cv2.getTextSize(text, font, font_scale, font_thickness)[0]
                text_x = frame.shape[1] - text_size[0] - 10
                text_y = 10 + text_size[1]
                cv2.rectangle(frame, (text_x - 5, text_y - text_size[1] - 5), 
                            (text_x + text_size[0] + 5, text_y + 5), (0, 0, 0), -1)
                cv2.putText(frame, text, (text_x, text_y), font, font_scale, (255, 255, 255), font_thickness)
                
                # Add FPS counter
                frame_count += 1
                if frame_count % 30 == 0:
                    fps = 30 / (time.time() - fps_start_time)
                    fps_start_time = time.time()
                    # self.logger.info(f"Camera {camera_no} FPS: {fps:.1f}")
                
                # Draw areas and detect objects
                self.area_manager.draw_areas(frame, camera['camera_no'])
                self.object_detector.detect_objects(
                    frame, camera['camera_no'], self.last_detection_times, 
                    self.last_alert_times, self.time_for_open_camera, 
                    self.alert_manager, self.db_manager
                )

                cv2.imshow(f"Camera {camera['camera_no']}", frame)
                
                if time.time() - start_time_detected > self.time_for_open_camera:
                    self.logger.info(f"Closing camera {camera_no} after {self.time_for_open_camera/60} minutes.")
                    break

                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                
            cap.release()
            cv2.destroyWindow(f"Camera {camera['camera_no']}")
            
        # Check exclusion rules
        if camera['camera_no'] in ["5", "149", "150"]:
            if self._is_time_in_except_ranges():
                self.logger.info(f"Camera {camera['camera_no']} excluded due to exercise time.")
                return
            else:
                stream()
        elif camera['camera_no'] in ["55", "105"]:
            if self._is_time_in_except_ranges_carpark():
                self.logger.info(f"Camera {camera['camera_no']} excluded due to carpark time.")
                return
            else:
                stream()
        else:
            stream()

    def run(self):
        """Main execution loop with GPU optimization"""
        self.logger.info("Starting GPU-Optimized Walkway Detection System")
        
        if not torch.cuda.is_available():
            self.logger.warning("CUDA not available. Performance may be reduced.")
        
        num_cameras = len(self.cameras)
        self.logger.info(f"Processing {num_cameras} cameras with batch size {self.batch_size}")
        
        while True: 
            try:
                for start_index in range(0, num_cameras, self.batch_size):
                    end_index = min(start_index + self.batch_size, num_cameras)
                    
                    # Reset detection timers for current batch
                    for i in range(start_index, end_index):
                        camera_no = self.cameras[i]['camera_no']
                        self.last_detection_times[camera_no] = None

                    # Process cameras using ThreadPoolExecutor
                    with ThreadPoolExecutor(max_workers=self.batch_size) as executor:
                        futures = []
                        
                        for i in range(start_index, end_index):
                            camera = self.cameras[i]
                            cam_url = f"rtsp://{camera['username']}:{camera['password']}@{camera['ip_address']}:{camera['port_number']}/Streaming/Channels/102"
                            
                            future = executor.submit(self.process_camera_stream, cam_url, camera)
                            futures.append((future, camera['camera_no']))
                        
                        # Wait for all cameras in batch to complete
                        for future, camera_no in futures:
                            try:
                                future.result()
                                self.logger.info(f"Camera {camera_no} processing completed")
                            except Exception as e:
                                self.logger.error(f"Camera {camera_no} processing failed: {e}")

                    time.sleep(2)
                    
                    # Clean up GPU memory between batches
                    self.model_manager.cleanup()
                    
                self.logger.info("Restarting camera cycle...")
                
            except KeyboardInterrupt:
                self.logger.info("Stopping Walkway Detection System...")
                break
            except Exception as e:
                self.logger.error(f"Unexpected error in main loop: {e}")
                time.sleep(5)

# =============================================================================
# MAIN FUNCTION
# =============================================================================

def main():
    """Main function with GPU optimization"""
    try:
        camera_processor = CameraProcessor()
        camera_processor.run()
        camera_processor.logger.info('Program completed successfully!')
        
    except KeyboardInterrupt:
        print("Program interrupted by user")
    except Exception as e:
        print(f"Critical error occurred: {e}")
    finally:
        # Cleanup resources
        try:
            cv2.destroyAllWindows()
            print("Resources cleaned up successfully")
        except Exception as e:
            print(f"Error during cleanup: {e}")

if __name__ == "__main__":
    main()