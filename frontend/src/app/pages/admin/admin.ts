import { Component,inject,OnInit } from "@angular/core";
import { Firestore,collection,query,where,getDocs } from "@angular/fire/firestore";
import { CommonModule } from "@angular/common";
import { updateDoc,doc } from "firebase/firestore";
import { getAuth,signOut } from "firebase/auth";
import { Router } from "@angular/router";

@Component({

    selector: 'app-admin',
    templateUrl: './admin.html',
    styleUrls: ['./admin.css'],
    standalone:true,
    imports: [CommonModule]
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

    async changeStatus(collectionName:string,docId:string,newStatus:string)
    {
        try
        {
            const docRef = doc(this.db, collectionName, docId);
            await updateDoc(docRef, { status: newStatus });
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
