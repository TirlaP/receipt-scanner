import { initializeApp } from 'firebase/app';
import { 
  getAnalytics, 
  logEvent 
} from 'firebase/analytics';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
// Removing Storage imports since we don't have Firebase Storage
// import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { firebaseConfig } from './config';
import { Receipt } from '../../types';
import { v4 as uuidv4 } from 'uuid';

    console.log("firebaseConfig", firebaseConfig);
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// const storage = getStorage(app); // Commented out since we don't have Firebase Storage
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Helper to convert Date objects to Firestore Timestamps and back
const convertDates = (receipt: Receipt, toFirestore = true): any => {
  if (toFirestore) {
    // Make sure we have valid dates before converting
    const date = receipt.date ? new Date(receipt.date) : new Date();
    const createdAt = receipt.createdAt ? new Date(receipt.createdAt) : new Date();
    const updatedAt = receipt.updatedAt ? new Date(receipt.updatedAt) : new Date();
    
    // Create a new object instead of modifying the original to avoid reference issues
    const firestoreReceipt = { ...receipt };
    
    // Set timestamps
    firestoreReceipt.date = Timestamp.fromDate(date);
    firestoreReceipt.createdAt = Timestamp.fromDate(createdAt);
    firestoreReceipt.updatedAt = Timestamp.fromDate(updatedAt);
    
    // Ensure no undefined values in the receipt items
    if (firestoreReceipt.items) {
      firestoreReceipt.items = firestoreReceipt.items.map(item => ({
        id: item.id,
        name: item.name || '',
        quantity: item.quantity || 0,
        price: item.price || 0,
        unit: item.unit || '',
        category: item.category || '',
        totalAmount: item.totalAmount || (item.price * item.quantity) || 0
      }));
    }
    
    return firestoreReceipt;
  } else {
    // When converting from Firestore to app, ensure we have valid objects
    const convertedReceipt = { ...receipt };
    
    // Convert Timestamp to Date if it exists
    if (receipt.date && typeof receipt.date.toDate === 'function') {
      convertedReceipt.date = (receipt.date as unknown as Timestamp).toDate();
    }
    
    if (receipt.createdAt && typeof receipt.createdAt.toDate === 'function') {
      convertedReceipt.createdAt = (receipt.createdAt as unknown as Timestamp).toDate();
    }
    
    if (receipt.updatedAt && typeof receipt.updatedAt.toDate === 'function') {
      convertedReceipt.updatedAt = (receipt.updatedAt as unknown as Timestamp).toDate();
    }
    
    return convertedReceipt;
  }
};

// Helper function to validate and clean a receipt for Firestore
const cleanReceiptForFirestore = (receipt: Receipt, userId: string): any => {
  // Check for additionalImages to avoid undefined
  const hasAdditionalImages = !!(receipt.additionalImages && receipt.additionalImages.length > 0);
  const additionalImagesCount = receipt.additionalImages ? receipt.additionalImages.length : 0;
  
  // Create a clean object with all potential undefined values replaced with appropriate defaults
  return {
    // Required fields with defaults
    id: receipt.id,
    storeName: receipt.storeName || '',
    date: receipt.date || new Date(),
    total: receipt.total || 0,
    items: Array.isArray(receipt.items) ? receipt.items : [],
    createdAt: receipt.createdAt || new Date(),
    updatedAt: receipt.updatedAt || new Date(),
    userId: userId,
    
    // Optional fields with defaults
    merchantAddress: receipt.merchantAddress || '',
    merchantPhone: receipt.merchantPhone || '',
    paymentMethod: receipt.paymentMethod || '',
    currency: receipt.currency || '',
    taxAmount: receipt.taxAmount || 0,
    notes: receipt.notes || '',
    tags: Array.isArray(receipt.tags) ? receipt.tags : [],
    
    // Image metadata - ensure these are boolean values, not undefined
    hasMainImage: !!receipt.imageData,
    hasAdditionalImages: hasAdditionalImages,
    additionalImagesCount: additionalImagesCount,
    
    // Store image data directly in Firestore
    imageData: receipt.imageData || '',
    additionalImages: receipt.additionalImages || [],
    
    // Keep these fields for compatibility but we won't use them
    imageUrl: '',
    additionalImageUrls: []
  };
};

class FirebaseService {
  // Prepare image for Firestore by validating format and potentially compressing
  async prepareImageForFirestore(imageData: string): Promise<string> {
    try {
      if (!imageData) {
        console.log('No image data provided');
        return '';
      }
      
      // Validate image data format
      if (!imageData.startsWith('data:image')) {
        console.log('Image data not in correct format, attempting to fix');
        imageData = `data:image/jpeg;base64,${imageData.replace(/^data:image\/[a-z]+;base64,/, '')}`;
      }
      
      // Check the size of the image data
      const sizeInBytes = Math.ceil((imageData.length * 3) / 4);
      const sizeInKB = sizeInBytes / 1024;
      
      // Log the size
      console.log(`Image size: ${Math.round(sizeInKB)} KB`);
      
      // If the image is too large (approaching Firestore's 1MB limit), compress it
      if (sizeInKB > 700) {
        console.log('Image is too large, compressing...');
        
        // This is a simple compression method - we'll create a new image with reduced quality
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            
            // Calculate dimensions (maintain aspect ratio)
            let width = img.width;
            let height = img.height;
            
            // Scale down large images
            const maxDimension = 1000;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round(height * (maxDimension / width));
                width = maxDimension;
              } else {
                width = Math.round(width * (maxDimension / height));
                height = maxDimension;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx!.drawImage(img, 0, 0, width, height);
            
            // Convert to JPEG with reduced quality
            const compressedData = canvas.toDataURL('image/jpeg', 0.6);
            console.log(`Compressed image size: ${Math.round((compressedData.length * 3) / 4 / 1024)} KB`);
            
            resolve(compressedData);
          };
          
          img.onerror = () => {
            console.error('Error loading image for compression');
            resolve(imageData); // Return original on error
          };
          
          img.src = imageData;
        });
      }
      
      // Return the image data as is if it's small enough
      return imageData;
    } catch (error) {
      console.error('Error preparing image:', error);
      return '';
    }
  }
  
  // Analytics methods
  logAnalyticsEvent(eventName: string, eventParams?: Record<string, any>) {
    if (analytics) {
      logEvent(analytics, eventName, eventParams);
    }
  }

  // Authentication methods
  async registerUser(email: string, password: string, displayName: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update the user profile with display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
        this.logAnalyticsEvent('sign_up');
      }
      return userCredential.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      this.logAnalyticsEvent('login');
      return userCredential.user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      this.logAnalyticsEvent('logout');
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // FIX: Corrected implementation of onAuthStateChanged
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    // Return the unsubscribe function directly instead of invoking it
    return onAuthStateChanged(auth, callback);
  }

  waitForAuthStateChange(): Promise<User | null> {
    // This is the FIXED version based on the GitHub issue solution
    let unsubscribe: (() => void) | undefined;
    
    return new Promise((resolve, reject) => {
      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          resolve(user);
        },
        (error) => {
          reject(error);
        }
      );
    }).then((user) => {
      // Only unsubscribe after the promise is resolved
      if (unsubscribe) {
        unsubscribe();
      }
      return user as User | null;
    });
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
      this.logAnalyticsEvent('password_reset');
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  // Receipt methods
  async saveReceipt(receipt: Receipt): Promise<string> {
    try {
      if (!auth.currentUser) {
        console.error('Save receipt failed: User not authenticated');
        throw new Error('User not authenticated');
      }

      const userId = auth.currentUser.uid;
      
      // Generate ID if not present
      if (!receipt.id) {
        receipt.id = uuidv4();
      }

      console.log(`Saving receipt ${receipt.id} to cloud for user ${userId}`);
      console.log(`Receipt data: ${receipt.storeName}, date: ${new Date(receipt.date).toLocaleDateString()}, items: ${receipt.items.length}`);
      
      // Create a copy of the receipt to modify
      const updatedReceipt = { ...receipt };
      
      // Ensure all required fields are present to prevent undefined values
      updatedReceipt.items = updatedReceipt.items || [];
      updatedReceipt.createdAt = updatedReceipt.createdAt || new Date();
      updatedReceipt.updatedAt = updatedReceipt.updatedAt || new Date();
      
      // Ensure image data is in correct format
      if (updatedReceipt.imageData) {
        console.log(`Processing main image for receipt ${receipt.id}`);
        updatedReceipt.imageData = await this.prepareImageForFirestore(updatedReceipt.imageData);
      } else {
        updatedReceipt.imageData = ''; // Ensure it's not undefined
      }
      
      // Process additional images if they exist
      if (updatedReceipt.additionalImages && updatedReceipt.additionalImages.length > 0) {
        console.log(`Receipt has ${updatedReceipt.additionalImages.length} additional images`);
        
        // Process each additional image
        for (let i = 0; i < updatedReceipt.additionalImages.length; i++) {
          console.log(`Processing additional image ${i+1}`);
          updatedReceipt.additionalImages[i] = await this.prepareImageForFirestore(updatedReceipt.additionalImages[i]);
        }
      } else {
        updatedReceipt.additionalImages = []; // Ensure it's not undefined
      }
      
      // Use our helper function to clean the receipt for Firestore
      const cleanReceipt = cleanReceiptForFirestore(updatedReceipt, userId);
      
      // Convert dates to Firestore timestamps
      const receiptData = convertDates(cleanReceipt, true);
      
      console.log(`Cleaned receipt for Firestore - All fields have valid values`);

      try {
        console.log(`Storing receipt ${receipt.id} in Firestore`);
        // Try to store data in Firestore
        await setDoc(doc(db, 'receipts', receipt.id), receiptData);
        console.log(`Receipt ${receipt.id} saved to Firestore successfully`);
      } catch (firestoreError) {
        console.error('Could not save receipt to Firestore:', firestoreError);
        throw firestoreError;
      }
      
      this.logAnalyticsEvent('receipt_saved', { 
        has_items: receipt.items.length > 0,
        has_additional_images: cleanReceipt.hasAdditionalImages
      });
      
      return receipt.id;
    } catch (error) {
      console.error('Save receipt error:', error);
      throw error;
    }
  }

  async getReceipt(id: string): Promise<Receipt | null> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      console.log(`Fetching receipt ${id} from Firestore`);
      const receiptDoc = await getDoc(doc(db, 'receipts', id));
      
      if (!receiptDoc.exists()) {
        console.log(`Receipt ${id} not found in Firestore`);
        return null;
      }
      
      // Convert Firestore document to Receipt type
      const data = receiptDoc.data();
      const receipt = convertDates(data as Receipt, false);
      
      console.log(`Retrieved receipt ${id} from Firestore`);
      
      // Check for image data
      if (receipt.imageData) {
        console.log(`Receipt has image data`);
      } else {
        console.log(`No image data for receipt ${id}`);
      }
      
      // Check for additional images
      if (receipt.additionalImages && receipt.additionalImages.length > 0) {
        console.log(`Receipt has ${receipt.additionalImages.length} additional images`);
      }
      
      return receipt;
    } catch (error) {
      console.error('Get receipt error:', error);
      throw error;
    }
  }

  async getAllReceipts(): Promise<Receipt[]> {
    try {
      // Allow retrieving receipts even if not authenticated (for local-only usage)
      if (!auth.currentUser) {
        console.warn('User not authenticated, returning empty receipts array');
        return [];
      }

      const userId = auth.currentUser.uid;
      
      // Create a basic query without complex ordering to avoid index issues
      const receiptsQuery = query(
        collection(db, 'receipts'), 
        where('userId', '==', userId)
      );
      
      try {
        const querySnapshot = await getDocs(receiptsQuery);
        
        // Sort the results in memory instead of relying on Firestore ordering
        const receipts = querySnapshot.docs.map(doc => {
          return convertDates(doc.data() as Receipt, false);
        });
        
        // Sort by date descending
        return receipts.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });
      } catch (queryError: any) {
        // If the error contains "index" in the message, it's likely an index issue
        if (queryError && queryError.message && queryError.message.includes('index')) {
          console.error('Firestore index error, attempting simplified query');
          
          // Try a simpler query without any ordering or complex conditions
          const simpleQuery = query(
            collection(db, 'receipts'),
            where('userId', '==', userId)
          );
          
          const simpleSnapshot = await getDocs(simpleQuery);
          
          const receipts = simpleSnapshot.docs.map(doc => {
            return convertDates(doc.data() as Receipt, false);
          });
          
          // Sort manually
          return receipts.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
          });
        }
        
        // If it's not an index error or the simplified query also failed, rethrow
        throw queryError;
      }
    } catch (error) {
      console.error('Get all receipts error:', error);
      return [];
    }
  }

  async updateReceipt(receipt: Receipt): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      receipt.updatedAt = new Date();
      
      // Use our helper function to clean the receipt for Firestore
      const cleanReceipt = cleanReceiptForFirestore(receipt, auth.currentUser.uid);
      
      console.log(`Updating receipt ${receipt.id} with cleaned data`);
      
      // Update the document
      await updateDoc(doc(db, 'receipts', receipt.id), convertDates(cleanReceipt, true));
      
      this.logAnalyticsEvent('receipt_updated');
      
      return receipt.id;
    } catch (error) {
      console.error('Update receipt error:', error);
      throw error;
    }
  }

  async deleteReceipt(id: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      // Set up a connectivity check
      const testConnectivity = async () => {
        try {
          // Try to read a known document as a connectivity test
          await getDoc(doc(db, 'system', 'status'));
          return true;
        } catch (e) {
          return false;
        }
      };
      
      // Check if we're online before attempting to delete
      const isOnline = await testConnectivity();
      if (!isOnline) {
        console.warn('No connectivity to Firestore, skipping cloud delete');
        throw new Error('No connectivity to Firestore');
      }

      try {
        // Try to delete the document
        await deleteDoc(doc(db, 'receipts', id));
        this.logAnalyticsEvent('receipt_deleted');
      } catch (firestoreError) {
        console.error('Firestore delete error:', firestoreError);
        throw firestoreError;
      }
    } catch (error) {
      console.error('Delete receipt error:', error);
      throw error;
    }
  }

  // Synchronize local receipts with cloud
  async syncLocalReceipts(localReceipts: Receipt[]): Promise<{
    added: number,
    updated: number,
    conflicts: number
  }> {
    try {
      if (!auth.currentUser) {
        console.error('Sync failed: User not authenticated');
        throw new Error('User not authenticated');
      }
      
      let added = 0;
      let updated = 0;
      let conflicts = 0;
      
      console.log(`Syncing ${localReceipts.length} local receipts to cloud`);
      
      // Set up a connectivity check
      const testConnectivity = async () => {
        try {
          console.log("Testing Firebase connectivity...");
          
          // First try: Read from receipts collection
          try {
            // Create a simpler query - just fetch one receipt
            const simpleQuery = query(
              collection(db, 'receipts'),
              where('userId', '==', auth.currentUser.uid),
              // Add a limit to reduce data transfer
              limit(1)
            );
            
            const snapshot = await getDocs(simpleQuery);
            console.log(`Connectivity test - found ${snapshot.docs.length} receipts`);
            return true;
          } catch (queryError) {
            console.warn('Receipt query connectivity test failed:', queryError);
            
            // Second try: Write to a test collection
            try {
              // Try with a test collection that should have more permissive rules
              const testId = `test_${Date.now()}`;
              const testDocRef = doc(db, 'permission_tests', testId);
              
              await setDoc(testDocRef, {
                userId: auth.currentUser.uid,
                timestamp: new Date().toISOString(),
                testMessage: 'Connectivity test',
                // Add null values for all common fields to ensure they're properly handled
                total: 0,
                storeName: '',
                merchantAddress: '',
                merchantPhone: '',
                paymentMethod: '',
                currency: '',
                taxAmount: 0,
                notes: '',
                tags: []
              });
              
              console.log('Test document created successfully');
              
              // Clean up
              try {
                await deleteDoc(testDocRef);
                console.log('Test document cleaned up');
              } catch (cleanupError) {
                console.warn('Could not clean up test document:', cleanupError);
              }
              
              return true;
            } catch (writeError) {
              console.error('Write connectivity test failed:', writeError);
              
              // Last try: Check if we can at least read from a public collection
              try {
                const publicRef = doc(db, 'public', 'app_status');
                await getDoc(publicRef);
                console.log('Public document read successful');
                return true;
              } catch (publicReadError) {
                console.error('All connectivity tests failed. Last error:', publicReadError);
                return false;
              }
            }
          }
        } catch (e) {
          console.error('Connectivity test error:', e);
          return false;
        }
      };
      
      // Check if we're online
      const isOnline = await testConnectivity();
      if (!isOnline) {
        console.error('No connectivity to Firestore, skipping sync');
        return { added: 0, updated: 0, conflicts: 0 };
      }
      
      // Get all cloud receipts for comparison
      console.log('Fetching cloud receipts for comparison');
      const cloudReceipts = await this.getAllReceipts();
      console.log(`Found ${cloudReceipts.length} receipts in cloud`);
      
      const cloudReceiptsMap = new Map(cloudReceipts.map(r => [r.id, r]));
      
      // Process each local receipt with error handling for each operation
      for (const localReceipt of localReceipts) {
        try {
          console.log(`Processing receipt ${localReceipt.id}: ${localReceipt.storeName}, ${new Date(localReceipt.date).toLocaleDateString()}`);
          
          // Check if this receipt has additionalImages
          if (localReceipt.additionalImages && localReceipt.additionalImages.length > 0) {
            console.log(`Receipt ${localReceipt.id} has ${localReceipt.additionalImages.length} additional images`);
          }
          
          const cloudReceipt = cloudReceiptsMap.get(localReceipt.id);
          
          if (!cloudReceipt) {
            // New receipt, add to cloud
            console.log(`Receipt ${localReceipt.id} not found in cloud, adding`);
            try {
              try {
                // Clean the receipt first to ensure it has no undefined values
                const cleanedReceipt = {...localReceipt};
                
                // Ensure no undefined values for important fields
                cleanedReceipt.merchantPhone = cleanedReceipt.merchantPhone || '';
                cleanedReceipt.merchantAddress = cleanedReceipt.merchantAddress || '';
                cleanedReceipt.paymentMethod = cleanedReceipt.paymentMethod || '';
                cleanedReceipt.notes = cleanedReceipt.notes || '';
                cleanedReceipt.tags = cleanedReceipt.tags || [];
                
                // Keep record of image data for later verification
                const hasMainImage = !!cleanedReceipt.imageData && cleanedReceipt.imageData.length > 0;
                const additionalImageCount = cleanedReceipt.additionalImages ? cleanedReceipt.additionalImages.length : 0;
                
                await this.saveReceipt(cleanedReceipt);
              } catch (saveError) {
                console.error(`Failed to save receipt ${localReceipt.id} to cloud with specific error:`, saveError);
                
                // If we get here, try one more approach - create a minimal receipt
                try {
                  // Create a very minimal receipt with just the essential fields
                  const minimalReceipt: Receipt = {
                    id: localReceipt.id,
                    storeName: localReceipt.storeName || 'Unknown Store',
                    date: localReceipt.date || new Date(),
                    total: localReceipt.total || 0,
                    items: [],
                    createdAt: localReceipt.createdAt || new Date(),
                    updatedAt: localReceipt.updatedAt || new Date(),
                    imageData: '',  // Empty string instead of null to avoid undefined errors
                    additionalImages: [], // Explicitly set as empty array
                    merchantPhone: '',
                    merchantAddress: '',
                    paymentMethod: '',
                    currency: localReceipt.currency || '',
                    taxAmount: localReceipt.taxAmount || 0,
                    notes: '',
                    tags: []
                  };
                  
                  await this.saveReceipt(minimalReceipt);
                  console.log(`Saved minimal version of receipt ${localReceipt.id} to cloud`);
                  added++;
                } catch (minimalSaveError) {
                  console.error(`Even minimal receipt save failed for ${localReceipt.id}:`, minimalSaveError);
                  throw minimalSaveError;
                }
              }
              console.log(`Successfully added receipt ${localReceipt.id} to cloud`);
              console.log(`Image data status: main image ${hasMainImage ? 'present' : 'absent'}, ${additionalImageCount} additional images`);
              added++;
            } catch (saveError) {
              console.error(`Failed to save receipt ${localReceipt.id} to cloud:`, saveError);
              // Continue with the next receipt instead of failing the entire operation
            }
          } else {
            // Compare last updated date
            const localUpdatedAt = new Date(localReceipt.updatedAt);
            const cloudUpdatedAt = new Date(cloudReceipt.updatedAt);
            
            console.log(`Receipt ${localReceipt.id} found in cloud`);
            console.log(`Local updated: ${localUpdatedAt.toISOString()}, Cloud updated: ${cloudUpdatedAt.toISOString()}`);
            
            if (localUpdatedAt > cloudUpdatedAt) {
              // Local is newer, update cloud
              console.log(`Local receipt ${localReceipt.id} is newer, updating cloud`);
              try {
                await this.updateReceipt(localReceipt);
                console.log(`Successfully updated receipt ${localReceipt.id} in cloud`);
                updated++;
              } catch (updateError) {
                console.error(`Failed to update receipt ${localReceipt.id} in cloud:`, updateError);
                // Continue with the next receipt
              }
            } else if (localUpdatedAt < cloudUpdatedAt) {
              // Cloud is newer, mark as conflict
              console.log(`Cloud receipt ${localReceipt.id} is newer, marking as conflict`);
              conflicts++;
            } else {
              console.log(`Receipt ${localReceipt.id} is up to date`);
            }
          }
        } catch (receiptError) {
          console.error(`Error processing receipt ${localReceipt.id}:`, receiptError);
          // Continue with the next receipt
        }
      }
      
      console.log(`Sync completed: ${added} added, ${updated} updated, ${conflicts} conflicts`);
      
      // Only log analytics if we successfully processed some receipts
      if (added > 0 || updated > 0 || conflicts > 0) {
        this.logAnalyticsEvent('receipts_synced', {
          added,
          updated,
          conflicts
        });
      }
      
      return { added, updated, conflicts };
    } catch (error) {
      console.error('Sync receipts error:', error);
      // Return empty results instead of throwing, to allow the UI to continue
      return { added: 0, updated: 0, conflicts: 0 };
    }
  }
}

// Export as a singleton
export const firebaseService = new FirebaseService();