import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { ChevronDown, ChevronUp, Upload, ShieldCheck, AlertCircle, Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTMENTS = [
  'Engineering', 'HR', 'Finance', 'Operations', 'Legal', 'Executive', 'Other'
];

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description cannot exceed 2000 characters'),
  dateOfIncident: z.string().optional().refine(val => {
    if (!val) return true;
    return new Date(val) <= new Date();
  }, { message: 'Date cannot be in the future' }),
  department: z.string().optional(),
  involvedParties: z.string().max(200, 'Cannot exceed 200 characters').optional(),
  isWhistleblower: z.boolean().optional(),
  desiredOutcome: z.string().max(500, 'Cannot exceed 500 characters').optional(),
});

type FormValues = z.infer<typeof schema>;

interface SubmissionFormProps {
  orgCode: string;
  category: string;
  severity: string;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({ orgCode, category, severity }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProtectionNoticeOpen, setIsProtectionNoticeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      isWhistleblower: category === 'whistleblower'
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (files.length + selectedFiles.length > 3) {
        toast.error('Maximum 3 files allowed');
        return;
      }
      
      const validFiles = selectedFiles.filter(file => {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds 5MB limit`);
          return false;
        }
        return true;
      });
      
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const generateToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const submissionId = generateToken() + '-' + Date.now().toString(36);
      const publicToken = generateToken();
      
      // Upload attachments if any
      const attachmentUrls: string[] = [];
      for (const file of files) {
        const fileRef = ref(storage, `corporate/${orgCode}/attachments/${submissionId}/${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        attachmentUrls.push(url);
      }

      // Prepare payload to encrypt
      const rawPayload = {
        ...data,
        attachments: attachmentUrls
      };

      // Encrypt the payload using AES with orgCode as the key
      const encryptedPayload = CryptoJS.AES.encrypt(JSON.stringify(rawPayload), orgCode).toString();

      // Save to Firestore
      const docRef = doc(db, 'corporateSubmissions', submissionId);
      await setDoc(docRef, {
        orgCode,
        category,
        severity,
        encryptedPayload,
        submittedAt: serverTimestamp(),
        status: 'new',
        isRead: false,
        token: publicToken
      });

      // Clear local state heavily (just in case)
      setFiles([]);
      
      // Navigate to success page with the tracking token
      navigate('/chambers/submit/success', { state: { trackingId: publicToken } });

    } catch (err) {
      console.error(err);
      toast.error('ENCRYPTION OR TRANSMISSION FAILED. PLEASE TRY AGAIN. YOUR DATA REMAINS LOCAL.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full font-mono text-brandText animate-in fade-in duration-500">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Title & Desc */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-primary mb-2 flex justify-between">
              <span>INCIDENT TITLE //</span>
              {errors.title && <span className="text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.title.message}</span>}
            </label>
            <input 
              {...register('title')} 
              placeholder="Brief summary of the incident..."
              className="w-full bg-void border border-ghost p-3 text-white text-sm focus:border-primary focus:outline-none focus:shadow-[0_0_10px_rgba(110,231,247,0.1)] transition-all placeholder:text-muted/50"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-primary mb-2 flex justify-between">
              <span>DESCRIPTION //</span>
              {errors.description && <span className="text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.description.message}</span>}
            </label>
            <textarea 
              {...register('description')} 
              rows={6}
              placeholder="Detailed account. Avoid writing names of unrelated innocent parties if possible..."
              className="w-full bg-void border border-ghost p-3 text-white text-sm focus:border-primary focus:outline-none focus:shadow-[0_0_10px_rgba(110,231,247,0.1)] transition-all placeholder:text-muted/50 resize-none font-sans"
            />
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-primary mb-2 flex justify-between">
              <span>DATE OF INCIDENT //</span>
              {errors.dateOfIncident && <span className="text-danger">{errors.dateOfIncident.message}</span>}
            </label>
            <input 
              type="date"
              {...register('dateOfIncident')} 
              className="w-full bg-void border border-ghost p-3 text-white text-sm focus:border-primary focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-primary mb-2">
              <span>DEPARTMENT AFFECTED //</span>
            </label>
            <select 
              {...register('department')} 
              className="w-full bg-void border border-ghost p-3 text-white text-sm focus:border-primary focus:outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="" className="text-muted">Select Department...</option>
              {DEPARTMENTS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
            </select>
          </div>
        </div>

        <div>
           <label className="block text-[10px] uppercase tracking-widest text-primary mb-2 flex justify-between">
              <span>INVOLVED PARTIES //</span>
              {errors.involvedParties && <span className="text-danger">{errors.involvedParties.message}</span>}
           </label>
           <input 
              {...register('involvedParties')} 
              placeholder="Names or titles of individuals involved (optional)"
              className="w-full bg-void border border-ghost p-3 text-white text-sm focus:border-primary focus:outline-none transition-all placeholder:text-muted/50"
            />
        </div>

        <div>
           <label className="block text-[10px] uppercase tracking-widest text-primary mb-2 flex justify-between">
              <span>DESIRED OUTCOME //</span>
              {errors.desiredOutcome && <span className="text-danger">{errors.desiredOutcome.message}</span>}
           </label>
           <textarea 
              {...register('desiredOutcome')} 
              rows={3}
              placeholder="What resolution are you seeking? (optional)"
              className="w-full bg-void border border-ghost p-3 text-white text-sm focus:border-primary focus:outline-none transition-all placeholder:text-muted/50 resize-none font-sans"
            />
        </div>

        {/* Attachments Section */}
        <div className="border border-dashed border-primary/40 bg-primary/5 p-6 relative group transition-colors hover:bg-primary/10 cursor-pointer text-center">
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Upload evidence files"
            />
            <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
              <Upload className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <p className="text-secondary text-xs tracking-widest uppercase font-bold">
                DROP EVIDENCE FILES HERE OR CLICK TO ATTACH
              </p>
              <p className="text-[9px] text-muted tracking-wide uppercase">Max 3 files, 5MB each. Exif data stripped.</p>
            </div>
            
            {/* Display Attached Files */}
            {files.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center relative z-20 pointer-events-auto">
                {files.map((file, idx) => (
                  <div key={idx} className="bg-void border border-primary/30 px-3 py-1.5 flex items-center gap-3 text-[10px] text-brandText">
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); removeFile(idx); }}
                      className="text-danger hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Whistleblower Protection Panel */}
        <div className="border border-ghost bg-void overflow-hidden">
          <button 
            type="button"
            onClick={() => setIsProtectionNoticeOpen(!isProtectionNoticeOpen)}
            className="w-full flex items-center justify-between p-4 bg-surface text-xs tracking-widest uppercase font-bold hover:bg-surface/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-[#c084fc]" />
              <span>WHISTLEBLOWER PROTECTION NOTICE</span>
            </div>
            {isProtectionNoticeOpen ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
          </button>
          
          {isProtectionNoticeOpen && (
            <div className="p-4 text-[10px] md:text-xs text-muted leading-relaxed font-sans border-t border-ghost">
              <p className="mb-2">Under Federal and State Whistleblower Protection acts, you are protected from retaliation for reporting fraud, abuse, or safety hazards.</p>
              <p>Anonymax handles your data securely via end-to-end AES encryption. Note that true anonymity depends on the specificity of the details you provide. Do not include identifiable writing styles or specific non-public knowledge if you wish to remain entirely unidentifiable.</p>
              <div className="mt-4 flex items-center gap-2">
                <input type="checkbox" {...register('isWhistleblower')} id="isWhistleblower" className="accent-[#c084fc] cursor-pointer" />
                <label htmlFor="isWhistleblower" className="text-[#c084fc] font-bold tracking-widest uppercase cursor-pointer">
                  Flag as Formal Whistleblower Report
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="pt-6 border-t border-ghost flex flex-col items-center gap-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full relative group overflow-hidden bg-primary/20 hover:bg-primary border border-primary text-primary hover:text-void py-5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 font-bold tracking-[0.2em] text-sm uppercase flex items-center justify-center gap-3">
              {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> ENCRYPTING PAYLOAD...</> : 'ENCRYPT & TRANSMIT REPORT'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </button>

          <div className="flex items-center gap-2 text-[10px] tracking-widest text-[#22c55e] uppercase">
            <Lock className="w-3 h-3 animate-pulse glow-green" />
            <span>YOUR IDENTITY IS NOT COLLECTED</span>
          </div>
        </div>

      </form>
    </div>
  );
};
