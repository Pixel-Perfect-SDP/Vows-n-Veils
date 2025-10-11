import { Component,inject,OnInit } from "@angular/core";
import { Firestore,collection,query,where,getDocs } from "@angular/fire/firestore";
import { CommonModule } from "@angular/common";
import { updateDoc,doc, addDoc } from "firebase/firestore";
import { getAuth,signOut } from "firebase/auth";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";

@Component({

    selector: 'app-admin',
    templateUrl: './admin.html',
    styleUrls: ['./admin.css'],
    standalone:true,
    imports: [CommonModule,FormsModule]
})

export class Admin implements OnInit
{
    private db: Firestore = inject(Firestore);
    private router=inject(Router);

    vendors : any[] = [];
    venues : any[] = [];
    loadingVendors=false;
    loadingVenues=false;

    constructor(){}

    ngOnInit()
    {
        const auth=getAuth();
        if (!auth.currentUser)
        {
            this.router.navigateByUrl('/landing');
            return;
        }
        this.fetchVendors();
        this.fetchVenues();
    }

    ngOnDestroy()
    {
        this.vendors=[];
        this.venues=[];
    }

        async fetchVendors()
        {
            try
        {
            this.loadingVendors=true;
            const vendorCollection = collection(this.db,'Vendors');
            const qVendor=query(vendorCollection,where('status','==','pending'));
            const querySnapshot=await getDocs(qVendor);

            this.vendors=querySnapshot.docs.map(doc=> ({
                id:doc.id,
                ...doc.data()
            }));
        }
        catch(error)
        {
            console.error("Error fetching vendors: ",error);
        }
        finally
        {
            this.loadingVendors=false;
        }
        }

        async fetchVenues()
        {
            try
        {
            this.loadingVenues=true;
            const venueCollection=collection(this.db,'Venues');
            const qVenue=query(venueCollection, where('status','==','pending'))
            const querySnapshot=await getDocs(qVenue);

            this.venues=querySnapshot.docs.map(doc=> ({
                id:doc.id,
                ...doc.data()
            }));
        }
        catch(error)
        {
            console.error("Error fetching venues: ",error);
        }
        finally
        {
            this.loadingVenues=false;
        }
        }

    async changeStatus(collectionName:string,docId:string,newStatus:string,reason?:string)
    {
        try
        {
            const docRef = doc(this.db, collectionName, docId);
            const compID=collectionName==='Vendors' ? this.vendors.find(vendor=>vendor.id===docId)?.companyID : this.venues.find(venue=>venue.id===docId)?.companyID;
            await updateDoc(docRef, { status: newStatus });

            if (newStatus=='rejected')
            {
                const reasonCollection = collection(this.db, 'Notifications');
                const name = collectionName === 'Vendors' ? this.vendors.find(vendor => vendor.id === docId)?.name : this.venues.find(venue => venue.id === docId)?.name;
                await addDoc(reasonCollection,
                {
                    date: new Date().toISOString(),
                    from:"Admin",
                    to: compID,
                    message: `Your ${collectionName.slice(0,-1)} application for ${name} has been rejected becuase ${reason||'no reason provided'}.`,
                    read: false

                });

            }

            if (collectionName === 'Vendors') {
                this.vendors = this.vendors.filter(vendor => vendor.id !== docId);
            } else if (collectionName === 'Venues') {
                this.venues = this.venues.filter(venue => venue.id !== docId);
            }
        }
        catch(error)
        {
            console.error(`Error updating status for ${collectionName} with ID ${docId}: `,error);
        }
    }

    logout()
    {
        const auth=getAuth();
        signOut(auth).then(()=>
        {
            localStorage.clear();
            sessionStorage.clear();
            this.router.navigate(['/landing']);
        })
        .catch((error)=>
        {
            console.error("Error during sign out: ",error);
        });
    }


}
