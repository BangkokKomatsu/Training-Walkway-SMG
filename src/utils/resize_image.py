import os
import PIL
from PIL import Image

def resize_images_in_folder(folder_path, output_folder, size):
    # Walk through all the files and subdirectories
    for dirpath, dirnames, filenames in os.walk(folder_path):
        for filename in filenames:  # Iterate over files in the current directory
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
                img_path = os.path.join(dirpath, filename)  # Join dirpath and filename
                try:
                    # Open an image file
                    with Image.open(img_path) as img:
                        # Resize image
                        img_resized = img.resize(size)
                        
                        # Determine output path
                        relative_path = os.path.relpath(dirpath, folder_path)
                        output_dir = os.path.join(output_folder, relative_path)
                        os.makedirs(output_dir, exist_ok=True)  # Create output dir if it doesn't exist
                        
                        # Save the resized image
                        output_path = os.path.join(output_dir, filename)  # Use filename for the output
                        img_resized.save(output_path)
                        print(f'Resized and saved: {output_path}')
                except Exception as e:
                    print(f'Cannot process image {img_path}: {e}')

if __name__ == "__main__":
    input_folder = "xx/xx/xx"
    output_folder = "xx/xx/xx/resize_file"  # Specify a different output folder
    new_size = (500,400) 

    # Call the function
    resize_images_in_folder(input_folder, output_folder, new_size)
