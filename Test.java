import java.net.InetAddress;
public class Test {
    public static void main(String[] args) {
        try {
            InetAddress.getAllByName("cinibook-db-raavijithinsai-f100.f.aivencloud.com");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
